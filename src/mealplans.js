import axios from 'axios';
import React from 'react';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import DiffMatchPatch from 'diff-match-patch';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import TextareaAutosize from 'react-textarea-autosize';
import moment from 'moment';
const MealPlanDailyAttachments = require('./attachment.js').MealPlanDailyAttachments;

class MealPlanDailySelfie extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      data: props.data,
      date: props.date,
      enableUpload: props.enableUpload
    };
    this.onFileChange = this.onFileChange.bind(this);
    this.handleUploadSelfieButtonClick = this.handleUploadSelfieButtonClick.bind(this);
  }

  handleUploadSelfieButtonClick(event) {
    $('#input-fileupload-selfie').click();
    // It is used to apply unified button style to file upload button...
    // It is jQuery...but ...it works!
  }

  onFileChange(event) {
    this.setState({
      selectedFile: event.target.files[0]
    });
    this.onFileUpload(event.target.files[0]);
  };

  onFileUpload(selectedFile) {
    const payload = new FormData();
    payload.append('selected_file', selectedFile);
    axios.post('./upload-selfie/', payload)
        .then((response) => {
          // an alert is not needed since the user will see the change of the thumbnail.
          this.forceUpdate();
          // This forceUpdate() is needed so that the new image will be shown
        })
        .catch((error) => {
          console.log(error);
          alert('自拍照上传错误\n' + error);
          // You canNOT write error.response or whatever similar here.
          // The reason is that this catch() catches both network error and other errors,
          // which mdiff_ay or may not have a response property.
        });
  }

  render() {
    let buttonUpload = null;
    if (this.props.enableUpload === true) {
      buttonUpload = (
        <div style={{paddingBottom: '3em', paddingTop: '1em'}}>
          <Button className="pull-right" variant="primary" onClick={this.handleUploadSelfieButtonClick}>上传自拍</Button>
          <input id="input-fileupload-selfie" onChange={this.onFileChange} type="file"
            style={{display: 'none'}} accept="image/png, image/gif, image/jpeg" />
          {/* button and input is bound using jQuery... */}
          {/* image/jpeg includes jpg and jpeg extensions. */}
        </div>
      );
    }

    return (
      <div>
        <h6 className="text-primary"><b>自拍</b></h6>
        <div>
          <img src={`./get-selfie/?date=${moment(this.props.date).format('YYYY-MM-DD')}&${new Date().getTime()}`} alt=""
            style={{display: 'block', marginLeft: 'auto', marginRight: 'auto', maxWidth: '100%', width: '300px'}} />
          {/* If alt="" is added, the broken image icon won't show if src is not found. */}
        </div>
        {buttonUpload}
      </div>
    );
  }
}

MealPlanDailySelfie.propTypes = {
  date: PropTypes.instanceOf(Date),
  data: PropTypes.object,
  enableUpload: PropTypes.bool
};

class MealPlanDailyRemark extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data
    };
    this.handleRemarkChange = this.handleRemarkChange.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      this.setState({data: this.props.data});
    }
  }

  handleRemarkChange(event) {
    if (this.props.sendData != null) {
      const currentData = this.state.data;
      currentData.remark.content = event.target.value;
      /* The issue is, React's  setState() cannot handle nested properties so here we
        create a new instance and send back the instance as a whole. */
      this.props.sendData(currentData);
    }
  }

  render() {
    let remarkChangeInfo;
    if (this.props.data.remark.modification_type == 0) {
      remarkChangeInfo = <span className='text-danger'><b> - 与昨日完全相同！</b></span>;
    }

    return (
      <div>
        <h6 className="text-primary"><b>备注{remarkChangeInfo}</b></h6>
        <TextareaAutosize value={this.props.data.remark.content} onChange={this.handleRemarkChange}
          style={{width: '99%', outline: '0', borderWidth: '0 0 1px'}}/>
      </div>
    );
  }
}

MealPlanDailyRemark.propTypes = {
  data: PropTypes.object,
  sendData: PropTypes.func
};

class MealPlanItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data
    };
    this.handleContentChange = this.handleContentChange.bind(this);
    this.handleFeedbackChange = this.handleFeedbackChange.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      this.setState({data: this.props.data});
    }
  }

  handleContentChange(event) {
    if (this.props.sendData != null) {
      const currentData = this.state.data;
      currentData[this.props.itemName].content = event.target.value;
      /* The issue is, React's setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
      this.props.sendData(currentData);
    }
  }

  handleFeedbackChange(event) {
    const currentData = this.state.data;
    currentData[this.props.itemName].feedback = event.target.value;
    /* The issue is, React.js' setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
    if (this.props.sendData != null) {
      this.props.sendData(currentData);
    }
  }

  getFeedbackSelect() {
    const optionsValueList = [
      'A - 大便成形，饮食正常量，无饱胀/腹痛/不适',
      'B - 大便不成形', 'B - 饮食减量', 'B - 轻微腹痛或轻微不适',
      'C - 拉稀', 'C - 饮食较大减量', 'C - 腹痛或较严重不适', '待填'
    ];
    if (optionsValueList.includes(this.props.data[this.props.itemName].feedback) == false) {
      optionsValueList.push(this.props.data[this.props.itemName].feedback);
    }
    const optionsList = [];
    for (let i = 0; i < optionsValueList.length; i ++) {
      optionsList.push(
          <option key={i} value={optionsValueList[i]}>{optionsValueList[i]}</option>
      );
    }
    let feedbackColor = 'black';
    if (this.props.data[this.props.itemName].feedback === optionsValueList[0]) {
      feedbackColor = 'var(--bs-success)';
    } else if (optionsValueList.slice(4, 7).includes(this.props.data[this.props.itemName].feedback)) {
      feedbackColor = 'var(--bs-danger)';
    }
    const feedbackStyle = {
      color: feedbackColor,
      fontWeight: 'bold'
    };
    return (
      <Form.Select style={feedbackStyle} value={this.props.data[this.props.itemName].feedback}
        onChange={this.handleFeedbackChange}>
        {optionsList}
      </Form.Select>
    );
  }

  render() {
    const modType = this.props.data[this.props.itemName].modification_type;
    let planChangeInfo = null;
    let prettyDiff;
    if (modType == 1) {
      planChangeInfo = <span className="text-muted"> - 安全</span>;
    } else if (modType == 2) {
      planChangeInfo = <span className="text-danger"> - !!危险!!</span>;

      let previousText = this.props.data[this.props.itemName].prev;
      let currentText = this.props.data[this.props.itemName].content;
      if (previousText.length >= 4) {
        if (isNaN(previousText.substring(0, 4)) == false) {
          previousText = previousText.substring(4);
        }
      }
      if (currentText.length >= 4) {
        if (isNaN(currentText.substring(0, 4)) == false) {
          currentText = currentText.substring(4);
        }
      }

      const dmp = new DiffMatchPatch();
      const diff = dmp.diff_main(previousText, currentText);
      prettyDiff = (
        <span style={{marginLeft: '0.5em', fontSize: '12px'}}>
          <b>对照：</b>
          <span dangerouslySetInnerHTML={{__html: dmp.diff_prettyHtml(diff)}} />
        </span>);
    }
    return (
      <div style={{marginBottom: '1.5em'}}>
        <div>
          <Row style={{marginBottom: '0.7em'}}>
            <Col className="my-auto">
              <h6 className="my-auto text-primary">
                {/* seems we do need my-auto for both to make text vertically aligned. */}
                <b>{this.props.data[this.props.itemName].title}{planChangeInfo}</b>
              </h6>
            </Col>
            <Col xs={7}>{this.getFeedbackSelect()}</Col>
          </Row>
        </div>
        <div>
          <TextareaAutosize value={this.props.data[this.props.itemName].content} onChange={this.handleContentChange}
            style={{width: '99%', outline: '0', borderWidth: '0 0 1px'}}/>
        </div>
        {prettyDiff}
      </div>
    );
  }
}

MealPlanItem.propTypes = {
  data: PropTypes.object,
  itemName: PropTypes.string,
  sendData: PropTypes.func
};


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
    axios.get('./get-meal-plan/?date=' + moment(this.props.date).format('YYYY-MM-DD'))
        .then((response) => {
          this.setState({
            data: response.data
          });
        })
        .catch((error) => {
          alert(
            `${moment(this.props.date).format('YYYY-MM-DD')}的食谱项目加载失败！原因：\n` +
            (error.response !== undefined) ? JSON.stringify(error.response): error
          );
        });
  }

  handleCopyTodayClick(event) {
    const today = new Date(this.state.date);
    today.setDate(today.getDate() - 1);
    axios.get('./get-meal-plan/?date=' + moment(this.props.date).format('YYYY-MM-DD'))
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
    payload.append('date', moment(this.props.date).format('YYYY-MM-DD'));
    payload.append('data', JSON.stringify(this.state.data));
    axios({
      method: 'post',
      url: './update-meal-plan/',
      data: payload
    })
        .then(() => {
          alert(`${moment(this.props.date).format('YYYY-MM-DD')}的食谱更新成功！`);
          this.fetchDataFromServer();
        })
        .catch((error) => {
          alert(`${moment(this.props.date).format('YYYY-MM-DD')}的食谱更新错误！\n原因：${error}`);
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
    const isDBY = moment().subtract(2, 'days').format('YYYY-MM-DD') === moment(this.props.date).format('YYYY-MM-DD');
    const isYesterday = (
      moment().subtract(1, 'days').format('YYYY-MM-DD') === moment(this.props.date).format('YYYY-MM-DD')
    );
    const isToday = moment().format('YYYY-MM-DD') === moment(this.props.date).format('YYYY-MM-DD');
    const isTomorrow = (
      moment().add(1, 'days').format('YYYY-MM-DD') === moment(this.props.date).format('YYYY-MM-DD')
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
            (isDBY || isYesterday || isToday || isTomorrow) ?
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
