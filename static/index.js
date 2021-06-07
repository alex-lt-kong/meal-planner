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
            <textarea class="w3-input textarea-dailyremark" rows="8" onChange={this.handleChange}>
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
      date: props.date,
      itemName: props.itemName
    };
    this.handleContentChange = this.handleContentChange.bind(this);
    this.handleFeedbackChange = this.handleFeedbackChange.bind(this);
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
            <textarea id={this.state.date + '-' + this.state.itemName} class="w3-input textarea-mealplanitem" rows="1"
                      onInput={this.handleContentChange}>
              {this.state.data[this.state.itemName].content}
            </textarea>
          </div>
          <div class="w3-cell">
            <select class="w3-select" value={this.state.data[this.state.itemName].feedback} onChange={this.handleFeedbackChange} >
              /* If value matches nothing, seems that React.js will simply select the first itm.*/
              <option class="w3-text-black" selected value="待填">待填</option>
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
      date: props.date,
      convenientDateName: props.convenientDateName,
      show: props.show,
      data: null /* Will be initialized in componentDidMount() */
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleAccordionClick = this.handleAccordionClick.bind(this);
    this.handleAccordionShow = this.handleAccordionShow.bind(this);    
    this.getData = this.getData.bind(this);
  }

  getData(value){
    // do not forget to bind getData in constructor
    this.setState({ data: value });
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
    let currentComponent = this;
    const payload = new FormData();
    payload.append('date', this.state.date);
    payload.append('data', JSON.stringify(this.state.data));
    axios({
      method: "post",
      url: "https://monitor.sz.lan/meal-planner/update-meal-plan/",
      data: payload,
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then(function (response) {
      alert(currentComponent.state.date + '的食谱更新成功！');
      console.log(response);
    })
    .catch(function (error) {
      console.log(error.response);
      alert('错误\n状态码：' + error.response.status + '\n错误提示：' + error.response.data);
    });
    event.preventDefault();
  }

  componentDidMount() {
    let currentComponent = this;
    axios.get('https://monitor.sz.lan/meal-planner/get-meal-plan/?date=' + this.state.date)
      .then(function (response) {
        // handle success
        currentComponent.setState({
          data: response.data
        });
        textAreaAdjust();
        // textAreaAdjust() has to be called twice. 
        // This call adjusts the height of textareas after initialization.
      })
      .catch(function (error) {
        alert('加载食谱项目失败！请关闭窗口后重试！');
      });
  }

  render() {
    if (this.state.data === null) { return null }
    return (
      <div class="accordion" >
        <button onClick={this.handleAccordionClick} class="w3-button w3-block w3-left-align w3-green">
          {this.state.convenientDateName}食谱({this.state.date})
          <span class="w3-right">▴</span>
        </button>
        <div className={`w3-hide w3-container w3-card-4 ${this.state.show ? "w3-show" : ""}`} onShow={this.handleAccordionShow}>
          {/* The current implementation is that we are going to pass the entire json to each 
            MealPlanItem so that it would be easier to handle while MealPlanItem sends data back */}
          <MealPlanItem date={this.state.date} data={this.state.data} itemName="breakfast" sendData={this.getData} />
          <MealPlanItem date={this.state.date} data={this.state.data} itemName="morning_extra_meal" sendData={this.getData} />
          <MealPlanItem date={this.state.date} data={this.state.data} itemName="lunch" sendData={this.getData} />
          <MealPlanItem date={this.state.date} data={this.state.data} itemName="afternoon_extra_meal" sendData={this.getData} />
          <MealPlanItem date={this.state.date} data={this.state.data} itemName="dinner" sendData={this.getData} />
          <MealPlanItem date={this.state.date} data={this.state.data} itemName="evening_extra_meal" sendData={this.getData} />
          <MealPlanDailyRemark data={this.state.data} sendData={this.getData} />          
          <div>
            <form onSubmit={this.handleSubmit}>
              <input class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button" type="submit" value="提交" />
            </form>
          </div>
        </div>
      </div>
    );
  }
}

const today = new Date();
const yesterday = new Date(today);
const tomorrow = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
tomorrow.setDate(tomorrow.getDate() + 1);

ReactDOM.render(
  <div>
    <MealPlan show={false} convenientDateName="昨日" date={yesterday.toISOString().slice(0, 10)}  />
    <MealPlan show={true}  convenientDateName="今日" date={today.toISOString().slice(0, 10)} />
    <MealPlan show={false} convenientDateName="明日" date={tomorrow.toISOString().slice(0, 10)} />
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