import React from 'react';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
const axios = require('axios').default;
const MealPlanItem = require('./common.js').MealPlanItem;
const MealPlanDailyRemark = require('./common.js').MealPlanDailyRemark;
const MealPlanDailySelfie = require('./common.js').MealPlanDailySelfie;
const MealPlanDailyAttachments = require('./attachment.js').MealPlanDailyAttachments;


class MealPlan extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null, /* Will be initialized in componentDidMount() */
      date: props.date,
      userName: null
    };
    this.handleClickUpdate = this.handleClickUpdate.bind(this);
    this.handleCopyTodayClick = this.handleCopyTodayClick.bind(this);
    this.getData = this.getData.bind(this);
  }

  getData(value) {
    // method use to receive data sent by children components.
    // do not forget to bind getData in constructor
    this.setState({data: value});
  }

  fetchDataFromServer() {
    axios.get('./get-meal-plan/?date=' + this.state.date.toISOString().slice(0, 10))
        .then((response) => {
          this.setState({
            data: response.data
          });
        })
        .catch((error) => {
          alert(
            `${this.state.date.toISOString().slice(0, 10)}的食谱项目加载失败！原因：\n` +
            (error.response !== undefined) ? JSON.stringify(error.response): error
          );
        });
  }

  handleCopyTodayClick(event) {
    const today = new Date(this.state.date);
    today.setDate(today.getDate() - 1);
    axios.get('./get-meal-plan/?date=' + today.toISOString().slice(0, 10))
        .then((response) => {
          this.setState({
            data: null
            // You have to make some drastic change. i.e., make the reference different, to
            // let react.js know that it needs to pass the new state to children components!
          });
          const data = response.data;
          data['breakfast']['feedback'] = '待填';
          data['morning_extra_meal']['feedback'] = '待填';
          data['lunch']['feedback'] = '待填';
          data['afternoon_extra_meal']['feedback'] = '待填';
          data['dinner']['feedback'] = '待填';
          data['evening_extra_meal']['feedback'] = '待填';
          this.setState({
            data: data
          });
        })
        .catch((error) => {
          alert('沿用今日失败！请重试！\n' + error);
        });
  }

  handleClickUpdate(event) {
    const payload = new FormData();
    payload.append('date', this.state.date.toISOString().slice(0, 10));
    payload.append('data', JSON.stringify(this.state.data));
    axios({
      method: 'post',
      url: './update-meal-plan/',
      data: payload
    })
        .then(() => {
          alert(`${this.state.date.toISOString().slice(0, 10)}的食谱更新成功！`);
          this.fetchDataFromServer();
        })
        .catch((error) => {
          alert(`${this.state.date.toISOString().slice(0, 10)}的食谱更新错误！\n原因：${error}`);
          // You canNOT write error.response or whatever similar here.
          // The reason is that this catch() catches both network error and other errors,
          // which may or may not have a response property.
        });
    event.preventDefault();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.date !== this.props.date) {
      this.setState({date: this.props.date}, () => {
        this.fetchDataFromServer();
      });
      // It is very important to remember that setState() is asynchronous!
      // So we need to use its callback to call functions that need new state!
    }
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }

  render() {
    if (this.state.data === null) {
      return null;
    }
    const isYesterday = (
      (new Date(new Date().getTime() - (24 * 60 * 60 * 1000))).toISOString().slice(0, 10) ===
      this.state.date.toISOString().slice(0, 10)
    );
    const isToday = (new Date()).toISOString().slice(0, 10) === this.state.date.toISOString().slice(0, 10);
    const isTomorrow = (
      (new Date(new Date().getTime() + (24 * 60 * 60 * 1000))).toISOString().slice(0, 10) ===
      this.state.date.toISOString().slice(0, 10)
    );

    return (
      <div>
        {/* The current implementation is that we are going to pass the entire json to each
          MealPlanItem so that it would be easier to handle while MealPlanItem sends data back */}
        <MealPlanItem data={this.state.data} itemName="breakfast" sendData={this.getData} />
        <MealPlanItem data={this.state.data} itemName="morning_extra_meal" sendData={this.getData} />
        <MealPlanItem data={this.state.data} itemName="lunch" sendData={this.getData} />
        <MealPlanItem data={this.state.data} itemName="afternoon_extra_meal" sendData={this.getData} />
        <MealPlanItem data={this.state.data} itemName="dinner" sendData={this.getData} />
        <MealPlanItem data={this.state.data} itemName="evening_extra_meal" sendData={this.getData} />
        <MealPlanDailyRemark data={this.state.data} sendData={this.getData} />
        <div style={{paddingBottom: '3em', paddingTop: '1.5em'}}>
          {
            (isYesterday || isToday || isTomorrow) ?
            <Button className="pull-right" style={{marginLeft: '1em'}} variant="primary"
              onClick={this.handleClickUpdate}>
              提交
            </Button> : null
          }
          {
            isTomorrow ?
            <Button className="pull-right" variant="primary" onClick={this.handleCopyTodayClick}>沿用今日</Button> : null
          }
        </div>
        <MealPlanDailySelfie data={this.state.data} date={this.state.date} enableUpload={isToday} />
        <MealPlanDailyAttachments enableEdit={isToday} enableUpload={isToday} date={this.state.date} />
        {/* Selfie and attachments uploads are only enabled for "today"! */}
      </div>
    );
  }
}

MealPlan.propTypes = {
  data: PropTypes.object,
  date: PropTypes.instanceOf(Date)
};

export {MealPlan};
