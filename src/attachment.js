import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import moment from 'moment';
import axios from 'axios';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
const $ = require('jquery');

class AttachmentsManager extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      date: props.date,
      enableEdit: props.enableEdit,
      enableUpload: props.enableUpload,
      renameModeFile: null,
      newFileName: null,
      uploadProgress: null
    };
    this.onFileUpload = this.onFileUpload.bind(this);
    this.handleClickFileName = this.handleClickFileName.bind(this);
    this.handleNewFilenameChange = this.handleNewFilenameChange.bind(this);
    this.handleClickFileRemove = this.handleClickFileRemove.bind(this);
    this.handleClickEnableRenameMode = this.handleClickEnableRenameMode.bind(this);
    this.handleClickSubmitNewFilename = this.handleClickSubmitNewFilename.bind(this);
    this.onFileChange = this.onFileChange.bind(this);
    this.componentDidUpdate - this.componentDidUpdate.bind(this);
    this.handleUploadAttachmentButtonClick = this.handleUploadAttachmentButtonClick.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.date !== this.props.date) {
      this.fetchDataFromServer();
    }
  }

  onFileChange(event) {
    this.setState({selectedFile: event.target.files[0]});
    const sizeLimit = 64 * 1024 * 1024;
    if (event.target.files[0].size > sizeLimit) {
      alert(`上传的文件不可超过${sizeLimit / 1024 / 1024}MB`);
      return;
    };
    this.onFileUpload(event.target.files[0]);
  };

  handleUploadAttachmentButtonClick(event) {
    $('#input-fileupload-attachment').click();
    // It is used to apply unified button style to file upload button...
    // It is jQuery...but ...it works!
  }

  onFileUpload(selectedFile) {
    const payload = new FormData();
    payload.append('selected_file', selectedFile);
    const config = {
      onUploadProgress: function(progressEvent) {
        const percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
        if (percentCompleted < 100) {
          this.setState({uploadProgress: percentCompleted});
          // How set state with percentCompleted?
        } else {
          this.setState({uploadProgress: null});
        }
      }.bind(this)
    };

    axios.post('./upload-attachment/', payload, config)
        .then((response) => {
          // an alert is not needed since the user will see the change of the files list.
          this.fetchDataFromServer();
        })
        .catch((error) => {
          console.log(error);
          alert(`附件上传错误\n原因：${error}`);
          // You canNOT write error.response or whatever similar here.
          // The reason is that this catch() catches both network error and other errors,
          // which may or may not have a response property.
        });
  }

  handleClickFileName(value) {
    value = encodeURIComponent(value);
    window.open(`./get-attachment/?date=${moment(this.props.date).format('YYYY-MM-DD')}&filename=${value}`);
  }

  handleClickFileRemove(value) {
    value = encodeURIComponent(value);
    axios.get('./remove-attachment/?date=' + moment(this.props.date).format('YYYY-MM-DD') + '&filename=' + value)
        .then((response) => {
        // an alert is not needed since the user will see the change of the files list.
          this.fetchDataFromServer();
        })
        .catch((error) => {
          alert(`文件[${value}]删除成功失败！\n原因：${error}`);
        });
  }

  handleClickSubmitNewFilename(value) {
    value = encodeURIComponent(value);
    axios.get(
        `./rename-attachment/?date=${moment(this.props.date).format('YYYY-MM-DD')}&` +
        `filename_old=${encodeURIComponent(this.state.renameModeFile)}&` +
        `filename_new=${encodeURIComponent(this.state.newFileName)}`
    )
        .then((response) => {
          this.setState({renameModeFile: null});
          this.fetchDataFromServer();
        })
        .catch((error) => {
          alert('重命名失败\n' + error);
        });
  }

  handleClickEnableRenameMode(value) {
    this.setState({
      renameModeFile: value,
      newFileName: value
    });
  }

  handleNewFilenameChange(event) {
    this.setState({newFileName: event.target.value});
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }

  fetchDataFromServer() {
    axios.get(`./get-attachments-list-by-date/?date=${moment(this.props.date).format('YYYY-MM-DD')}`)
        .then((response) => {
          this.setState({data: null}); // make it empty before fill it in again to force a re-rendering.
          this.setState({data: response.data});
        })
        .catch((error) => {
          alert(`${moment(this.props.date).format('YYYY-MM-DD')}附件列表加载失败！请关闭窗口后重试！\n原因：${error}`);
        });
  }

  render() {
    if (this.state.data === null) {
      return null;
    }
    let filenames = new Array(0);
    let i = 0;
    if (this.state.data.filenames === null) {

    } else {
      filenames = new Array(this.state.data.filenames.length);
      for (i = 0; i < this.state.data.filenames.length; i++) {
        let removeButton = null;
        let renameButton = null;
        let filenameDisplay = <a href="javascript:;"
          onClick={this.handleClickFileName.bind(this, this.state.data.filenames[i])}
          style={{textDecoration: 'none', width: '100%'}} >{this.state.data.filenames[i]}
        </a>;
        /* href="javascript:;" a link that goes to nowhere */;
        if (this.props.enableEdit === true) {
          removeButton = <img className="float-end" value={this.state.data.filenames[i]} src="./static/img/delete.png"
            style={{marginLeft: '1em', marginBottom: '0.66em', maxWidth: '1.25em'}}
            onClick={this.handleClickFileRemove.bind(this, this.state.data.filenames[i])} />;
        }
        if (this.props.enableEdit === true) {
          if (this.state.renameModeFile != this.state.data.filenames[i]) {
            renameButton = <img className="float-end" value={this.state.data.filenames[i]}
              src="./static/img/rename.png" style={{maxWidth: '1.25em'}}
              onClick={this.handleClickEnableRenameMode.bind(this, this.state.data.filenames[i])} />;
          } else {
            renameButton = <button className="float-end"
              onClick={this.handleClickSubmitNewFilename.bind(this, this.state.newFileName)}>完成</button>;
            filenameDisplay = <input type="text" style={{width: '100%'}}
              value={this.state.newFileName} onChange={this.handleNewFilenameChange}></input>;
          }
        }
        filenames[i] = (
          <li key={i} style={{paddingLeft: '0.2em', paddingRight: '0.2em'}}>
            <Row>
              <Col xs={8} className="my-auto">
                <div value={this.state.data.filenames[i]} >
                  {filenameDisplay}
                </div>
              </Col>
              <Col xs={4} className="my-auto">
                {removeButton}
                {renameButton}
              </Col>
            </Row>
          </li>
        );
      }
    }

    let progressBar = null;
    if (this.state.uploadProgress === null) {
    } else {
      progressBar = <span>（上传进度：{this.state.uploadProgress}%)</span>;
    }

    let uploadButton = null;
    if (this.props.enableUpload === true) {
      uploadButton = <div>
        <input id="input-fileupload-attachment" onChange={this.onFileChange} type="file" style={{display: 'none'}}>
        </input>
        <Button className="float-end" variant="primary" onClick={this.handleUploadAttachmentButtonClick}>
          上传附件
        </Button>
        {/* button and input is bound using jQuery... */}
      </div>;
    }
    return (
      <div>
        <ul>
          {filenames}
        </ul>
        {uploadButton}
        {progressBar}
      </div>
    );
  }
}

AttachmentsManager.propTypes = {
  enableEdit: PropTypes.bool,
  enableUpload: PropTypes.bool,
  date: PropTypes.instanceOf(Date)
};

class MealPlanDailyAttachments extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      date: props.date,
      enableUpload: props.enableUpload,
      enableEdit: props.enableEdit
    };
  }

  render() {
    return (
      <div>
        <div>
          <h6 className="text-primary"><b>附件</b></h6>
        </div>
        <AttachmentsManager enableUpload={this.props.enableUpload}
          enableEdit={this.props.enableEdit} date={this.props.date} />
      </div>
    );
  }
}

MealPlanDailyAttachments.propTypes = {
  enableEdit: PropTypes.bool,
  enableUpload: PropTypes.bool,
  date: PropTypes.instanceOf(Date)
};

export {MealPlanDailyAttachments};
