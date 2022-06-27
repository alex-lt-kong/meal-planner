const $ = require('jquery');
import axios from 'axios';
import moment from 'moment';
import React from 'react';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import DiffMatchPatch from 'diff-match-patch';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import TextareaAutosize from 'react-textarea-autosize';

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

  onFileUpload(selected_file) {
    const payload = new FormData();
    payload.append('selected_file', selected_file);
    console.log(selected_file);
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
        <div className="w3-cell-row">
          <div className="w3-cell">
            <TextareaAutosize value={this.props.data.remark.content} onChange={this.handleRemarkChange}
              style={{width: '99%', outline: '0', borderWidth: '0 0 1px'}}/>
          </div>
        </div>
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

export {MealPlanItem, MealPlanDailyRemark, MealPlanDailySelfie};
