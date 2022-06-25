import React from 'react';
import { createRoot } from 'react-dom/client';
const axios = require('axios').default;
const textAreaAdjust = require('./common.js').textAreaAdjust;
var MealPlanItem = require('./common.js').MealPlanItem;
var MealPlanDailyRemark = require('./common.js').MealPlanDailyRemark;
var MealPlanDailySelfie = require('./common.js').MealPlanDailySelfie;
var MealPlanDailyAttachments = require('./attachment.js').MealPlanDailyAttachments;

class PlanTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      date: props.date,
      data: props.data
    };
  }

  render() {
    if (this.props.data === null) {
      return null; 
    }
    return (
      <div style={{ width: "98%", "maxWidth": "1000px", margin: "auto", "marginTop": "4em", "marginBottom": "4em" }}>
          <MealPlanItem data={this.props.data} itemName="breakfast" />
          <MealPlanItem data={this.props.data} itemName="morning_extra_meal" />
          <MealPlanItem data={this.props.data} itemName="lunch" />
          <MealPlanItem data={this.props.data} itemName="afternoon_extra_meal" />
          <MealPlanItem data={this.props.data} itemName="dinner" />
          <MealPlanItem data={this.props.data} itemName="evening_extra_meal" />
          <MealPlanDailyRemark data={this.props.data} />
          <MealPlanDailySelfie enableUpload={false} date={new Date(this.props.data.metadata.date)} />
          <MealPlanDailyAttachments enableEdit={false} enableUpload={false} date={new Date(this.props.data.metadata.date)} />
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      date: props.date
    };
    this.handleChange = this.handleChange.bind(this);
    this.handlePreviousClick = this.handlePreviousClick.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);
  }

  componentDidMount() {
    this.fetchDataFromServer(this.state.date);
  }

  handleChange(event) {
    this.setState({
      date: new Date(event.target.value)
    });
    this.fetchDataFromServer(new Date(event.target.value));
    logUserActivity('[meal-planner/history-plans] ' + this.state.data.metadata.date, this.state.data.metadata.username);
  }

  handlePreviousClick(event) {
    let yesterday = new Date(this.state.date);
    yesterday.setDate(yesterday.getDate() - 1);
    this.setState(prevState => ({
      date: yesterday
    }));
    this.fetchDataFromServer(yesterday);
    logUserActivity('[meal-planner/history-plans] ' + this.state.data.metadata.date, this.state.data.metadata.username);
  }
  
  handleNextClick(event) {
    let tomorrow = new Date(this.state.date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.setState(prevState => ({
      date: tomorrow
    }));
    this.fetchDataFromServer(tomorrow);
    logUserActivity('[meal-planner/history-plans] ' + this.state.data.metadata.date, this.state.data.metadata.username);
  }

  fetchDataFromServer(date) {
    // Seems that we canNOT use this.state.date here because the update of
    // state is not in real-time.
    axios.get('./get-meal-plan/?date=' + date.toISOString().slice(0, 10))
      .then(response => {       
        this.setState({
          data: null
          // make it empty before fill it in again to force a re-rendering.
        });
        this.setState({
          data: response.data
        });
        textAreaAdjust();
        logUserActivity('[meal-planner/history-plans] ' + response.data.metadata.date, response.data.metadata.username);
        // Note that you canNOT use this.state.data instead of response.data here.
        // The reason, as I understand, is that setState() is an asynchronous function so you could get null if you use
        // this.state.data right after calling the setState() method.
      })
      .catch(error => {
        alert(date.toISOString().slice(0, 10) + '的食谱项目加载失败！请关闭窗口后重试！\n' + error);
      });
  }

  render() {   
    return (
    <div>
      <div className="fixed-header">
        <h5>食谱历史记录</h5>
      </div>
      <PlanTable data={this.state.data} />
      <div className="fixed-footer">
        <div className="w3-cell-row">
          <div className="w3-container w3-cell w3-cell-top">
            <p><a href="#" onClick={this.handlePreviousClick}>向前</a></p>
          </div>
          <div className="w3-container w3-cell w3-cell-middle">
            <form className="w3-center" action="./">
              <input type="date" 
              value={this.state.date.toISOString().substr(0,10)} onChange={this.handleChange} />
            </form>
          </div>
          <div className="w3-container w3-cell w3-cell-bottom">
            <p><a href="#" onClick={this.handleNextClick}>向后</a></p>
          </div>
        </div>
      </div>
    </div>
    );
  }
}
const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(
   // A hacky way of getting UTC+8...
<App date={new Date(new Date().getTime() + (8*60*60*1000))} />,
);