class MealPlanDailyRemark extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data
    };
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    console.log('From MealPlanDailyRemark, change detected: '+ event.target.value);
    var currentData = this.state.data;
    currentData.daily_remark = event.target.value;
    /* The issue is, React.js' setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
    this.props.sendData(currentData);
  }

  render() {
    return (
      <div>
        <div><p class="w3-text-green p-mealplanitem-title"><b>今日备注</b></p></div>
        <div class="w3-cell-row">
          <div class="w3-cell">
            <textarea class="w3-input textarea-dailyremark" rows="3" onChange={this.handleChange}>
              {this.state.data.daily_remark}
            </textarea>
          </div>
        </div>
      </div>
    );
  }
}

class MealPlanItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      itemName: props.itemName
    };
    this.handleContentChange = this.handleContentChange.bind(this);
    this.handleFeedbackChange = this.handleFeedbackChange.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Need this function for children components to update state
    // after state being changed in parent components.
   // this.setState({
    //  data: nextProps.data,
     // itemName: nextProps.itemName 
    //});
    return true;
  }

  handleContentChange(event) {
    console.log('handleContentChange');
    event.target.style.height = 'inherit';
    event.target.style.height = `${event.target.scrollHeight}px`; 

    var currentData = this.state.data;
    currentData[this.state.itemName].content = event.target.value;
    /* The issue is, React.js' setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
    this.props.sendData(currentData);
  }

  handleFeedbackChange(event) {
    var currentData = this.state.data;
    currentData[this.state.itemName].feedback = event.target.value;
    /* The issue is, React.js' setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
    this.props.sendData(currentData);
  }

  render() {
    return (
      <div>
        <div>
          <p class="w3-text-green p-mealplanitem-title">
            <b>{this.state.data[this.state.itemName].title}</b>
          </p>
        </div>
        <div class="w3-cell-row">
          <div class="w3-cell">
            <textarea class="w3-input textarea-mealplanitem" rows="1"
                      onInput={this.handleContentChange}>
              {this.state.data[this.state.itemName].content}
            </textarea>
          </div>
          <div class="w3-cell">
            <select class="w3-select" value={this.state.data[this.state.itemName].feedback} onChange={this.handleFeedbackChange} >
              {/* If value matches nothing, seems that React.js will simply select the first itm.*/}
              <option class="w3-text-black" value="待填">待填</option>
              <option class="w3-text-black" value="A">A</option>  
              <option class="w3-text-black" value="A-">A-</option>  
              <option class="w3-text-black" value="B+">B+</option>
              <option class="w3-text-black" value="B">B</option>
              <option class="w3-text-black" value="C">C</option>
              <option class="w3-text-black" value="没吃">没吃</option>
          </select>
          </div>
        </div>
      </div>
    );
  }
}

class MealPlan extends React.Component {

  constructor(props) {
    super(props);
    super(props);
    this.state = {
      id: props.id,
      date: props.date,
      convenientDateName: props.convenientDateName,
      show: props.show,
      data: null /* Will be initialized in componentDidMount() */
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleAccordionClick = this.handleAccordionClick.bind(this);
    this.handleCopyTodayClick = this.handleCopyTodayClick.bind(this);
    this.handleAccordionShow = this.handleAccordionShow.bind(this);    
    this.getData = this.getData.bind(this);
  }

  getData(value){
    // do not forget to bind getData in constructor
    this.setState({ data: value });
  }

  handleCopyTodayClick(event) {
    let today = new Date(this.state.date);
    today.setDate(today.getDate() - 1);
    axios.get('https://monitor.sz.lan/meal-planner/get-meal-plan/?date=' + today.toISOString().slice(0, 10))
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

  handleAccordionShow(event) {
    console.log('handleAccordionShow');
  }

  handleSubmit(event) {
    const payload = new FormData();
    payload.append('date', this.state.date.toISOString().slice(0, 10));
    payload.append('data', JSON.stringify(this.state.data));
    axios({
      method: "post",
      url: "https://monitor.sz.lan/meal-planner/update-meal-plan/",
      data: payload,
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then(response => {
      alert(this.state.date.toISOString().slice(0, 10) + '的食谱更新成功！');
      console.log(response);
    })
    .catch(error => {
      console.log(error.response);
      alert('错误\n状态码：' + error.response.status + '\n错误提示：' + error.response.data);
    });
    event.preventDefault();
  }

  componentDidMount() {
    axios.get('https://monitor.sz.lan/meal-planner/get-meal-plan/?date=' + this.state.date.toISOString().slice(0, 10))
      .then(response => {
        // handle success
        this.setState({
          data: response.data
        });
        textAreaAdjust();
      })
      .catch(error => {
        alert(this.state.date.toISOString().slice(0, 10) + '的食谱项目加载失败！请关闭窗口后重试！');
      });
  }

  render() {

    
    if (this.state.data === null) { return null }
    // So that if data is still not filled, an empty GUI will not be rendered.
    let buttonCopyToday;
    if (parseInt(this.state.id) === 3) {
      // Originally, I use convenientDateName === "明天" to achieve the same
      // However, it turns out that string comparison in Javascript is really strange...
      buttonCopyToday = <button class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button"
                                onClick={this.handleCopyTodayClick}>沿用今日</button>;
    }

    return (
      <div class="accordion" >
        <button onClick={this.handleAccordionClick} class="w3-button w3-block w3-left-align w3-green">
          {this.state.convenientDateName}食谱({this.state.date.toISOString().slice(0, 10)})
          <span class="w3-right">▴</span>
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
          <div>
            <form onSubmit={this.handleSubmit}>
              <input class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button" type="submit" value="提交" />
            </form>
            {buttonCopyToday}           
          </div>
        </div>
      </div>
    );
  }
}

// A hacky way of getting UTC+8...
const today = new Date(new Date().getTime() + (8*60*60*1000));
const yesterday = new Date(today);
const tomorrow = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
tomorrow.setDate(tomorrow.getDate() + 1);

ReactDOM.render(
  <div>
    <MealPlan id="1" show={false} convenientDateName="昨日" date={yesterday}  />
    <MealPlan id="2" show={true}  convenientDateName="今日" date={today} />
    <MealPlan id="3" show={false} convenientDateName="明日" date={tomorrow} />
  </div>,
  document.getElementById('root')
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function textAreaAdjust() {
  // As long as the function is decorated as async and there is a sleep() call,
  // this function can adjust the height of textarea successfully.
  await sleep(1);
  $('textarea').each(
    function(){  
      $(this)[0].style.height = "inherit";
      $(this)[0].style.height = (1 + $(this)[0].scrollHeight)+"px";
    }
  );
}