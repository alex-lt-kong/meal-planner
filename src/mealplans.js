const axios = require('axios').default;
const textAreaAdjust = require('./common.js').textAreaAdjust;
const MealPlanItem = require('./common.js').MealPlanItem;
const MealPlanDailyRemark = require('./common.js').MealPlanDailyRemark;
const MealPlanDailySelfie = require('./common.js').MealPlanDailySelfie;
const MealPlanDailyAttachments = require('./attachment.js').MealPlanDailyAttachments;


class MealPlan extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      appAddress: props.appAddress,
      convenientDateName: props.convenientDateName,
      data: null, /* Will be initialized in componentDidMount() */
      date: props.date,
      id: props.id,
      show: props.show,
      userName: null      
    };

    this.handleClickUpdate = this.handleClickUpdate.bind(this);
    this.handleAccordionClick = this.handleAccordionClick.bind(this);
    this.handleCopyTodayClick = this.handleCopyTodayClick.bind(this);  
    this.getData = this.getData.bind(this);
  }

  getData(value){
    // do not forget to bind getData in constructor
    this.setState({ data: value });
  }

  fetchDataFromServer() {
    axios.get(this.state.appAddress + '/get-meal-plan/?date=' + this.state.date.toISOString().slice(0, 10))
      .then(response => {
        // handle success
        this.setState({
          data: null
          // make it empty before fill it in again to force a re-rendering.
        });
        this.setState({
          data: response.data
        });
        textAreaAdjust();
      })
      .catch(error => {
        alert(this.state.date.toISOString().slice(0, 10) + '的食谱项目加载失败！请关闭窗口后重试！\n' + error);
      });
  }

  handleCopyTodayClick(event) {
    let today = new Date(this.state.date);
    today.setDate(today.getDate() - 1);
    axios.get(this.state.appAddress + 'get-meal-plan/?date=' + today.toISOString().slice(0, 10))
      .then(response => {
        // handle success
        this.setState({
          data: null
          // You have to make some drastic change. i.e., make the reference different, to
          // let react.js know that it needs to pass the new state to children components!
        });
        let data = response.data;
        data['breakfast']['feedback'] = '待填';
        data['morning_extra_meal']['feedback'] = '待填';
        data['lunch']['feedback'] = '待填';
        data['afternoon_extra_meal']['feedback'] = '待填';
        data['dinner']['feedback'] = '待填';
        data['evening_extra_meal']['feedback'] = '待填';
        this.setState({
          data: data
        });
        textAreaAdjust();
      })
      .catch(function (error) {
        alert('沿用今日失败！请重试！\n' + error);
      });
  }

  handleAccordionClick(event) {
    this.setState(prevState => ({
      show: !prevState.show
    }));
    textAreaAdjust();
    // textAreaAdjust() has to be called twice. 
    // This call adjusts the height of textareas after accordion expansion.
  }

  handleClickUpdate(event) {
    const payload = new FormData();
    payload.append('date', this.state.date.toISOString().slice(0, 10));
    payload.append('data', JSON.stringify(this.state.data));
    axios({
      method: "post",
      url: this.state.appAddress + "update-meal-plan/",
      data: payload,
    })
    .then(response => {
      alert(this.state.date.toISOString().slice(0, 10) + '的食谱更新成功！');
      this.fetchDataFromServer();
      // Must make this call to ensure UI is refreshed.
      logUserActivity('[meal-planner] Submit plan of ' + this.state.data.metadata.date, this.state.data.metadata.username);
    })
    .catch(error => {
      console.log(error);
      alert('错误：\n' + error);
      // You canNOT write error.response or whatever similar here.
      // The reason is that this catch() catches both network error and other errors,
      // which may or may not have a response property.
    });
    event.preventDefault();
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }

  render() {
    
    if (this.state.data === null) { return null; }
    // So that if data is still not filled, an empty GUI will not be rendered.
    let buttonCopyToday;
    if (parseInt(this.state.id) === 2) {
      // Originally, I use convenientDateName === "明天" to achieve the same
      // However, it turns out that string comparison in Javascript is really strange...
      buttonCopyToday = <button className="w3-button w3-border w3-highway-green w3-right w3-marginBottom input-button"
                                onClick={this.handleCopyTodayClick}>沿用今日</button>;
    }

    return (
      <div className="accordion" >
        <button onClick={this.handleAccordionClick} className="w3-button w3-block w3-left-align w3-green">
          {this.state.convenientDateName}食谱({this.state.date.toISOString().slice(0, 10)})
          <span className="w3-right">{this.state.show ? "▴" : "▾"}</span>
        </button>
        <div className={`w3-container w3-card-4 ${this.state.show ? "w3-show" : "w3-hide"}`}>
          {/* The current implementation is that we are going to pass the entire json to each 
            MealPlanItem so that it would be easier to handle while MealPlanItem sends data back */}
          <MealPlanItem data={this.state.data} itemName="breakfast" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="morning_extra_meal" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="lunch" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="afternoon_extra_meal" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="dinner" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="evening_extra_meal" sendData={this.getData} />
          <MealPlanDailyRemark data={this.state.data} sendData={this.getData} />
          <div style={{ "marginBottom": "3em" }}>
          {/* By applying w3-right to button, the button will not occupy any vertical space at all
              to compensate this, a "marginBottom" is added... */}
            <button className="w3-button w3-border w3-highway-green w3-right w3-marginBottom input-button" onClick={this.handleClickUpdate}>
              提交
            </button>
            {buttonCopyToday}           
          </div>
          <MealPlanDailySelfie data={this.state.data} enableUpload={parseInt(this.state.id) === 1} date={this.state.date} />
          <MealPlanDailyAttachments enableEdit={parseInt(this.state.id) === 1} enableUpload={parseInt(this.state.id) === 1} date={this.state.date} />
          {/* Selfie and attachments uploads are only enabled for "today"! */}
        </div>
      </div>
    );
  }
}

export { MealPlan };