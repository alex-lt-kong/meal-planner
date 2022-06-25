import React from 'react';
const axios = require('axios').default;

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
          logUserActivity(
              `[meal-planner] Upload attachment [${selectedFile.name}] to [${this.state.data.metadata.date}]`,
              this.state.data.metadata.username
          );
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
    window.open(`./get-attachment/?date=${this.props.date.toISOString().slice(0, 10)}&filename=${value}`);
    logUserActivity(
        `[meal-planner] Download attachment [${value}] from [${this.props.date.toISOString().slice(0, 10)}]`,
        this.state.data.metadata.username
    );
  }

  handleClickFileRemove(value) {
    value = encodeURIComponent(value);
    axios.get('./remove-attachment/?date=' + this.props.date.toISOString().slice(0, 10) + '&filename=' + value)
        .then((response) => {
        // an alert is not needed since the user will see the change of the files list.
          this.fetchDataFromServer();
          logUserActivity(
              `[meal-planner] Remove attachment [${value}] from [${this.state.data.metadata.date}]`,
              this.state.data.metadata.username
          );
        })
        .catch((error) => {
          alert(`文件[${value}]删除成功失败！\n原因：${error}`);
        });
  }

  handleClickSubmitNewFilename(value) {
    value = encodeURIComponent(value);
    axios.get(
        `./rename-attachment/?date=${this.props.date.toISOString().slice(0, 10)}&` +
        `filename_old=${encodeURIComponent(this.state.renameModeFile)}&` +
        `filename_new=${encodeURIComponent(this.state.newFileName)}`
    )
        .then((response) => {
          logUserActivity('[meal-planner] Rename attachment from [' + this.state.renameModeFile + '](' +
          this.props.date.toISOString().slice(0, 10) + ') to [' + this.state.newFileName + ']',
          this.state.data.metadata.username);
          // Need to logUserActivity() before setState()!
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
    console.log(`fetchDataFromServer()'ing`);
    axios.get(`./get-attachments-list/?date=${this.props.date.toISOString().slice(0, 10)}`)
        .then((response) => {
          this.setState({data: null}); // make it empty before fill it in again to force a re-rendering.
          this.setState({data: response.data});
        })
        .catch((error) => {
          alert(`${this.props.date.toISOString().slice(0, 10)}附件列表加载失败！请关闭窗口后重试！\n原因：${error}`);
        });
  }

  render() {
    if (this.state.data === null) {
      return null;
    }
    console.log(`AttachmentsManager.render()'ing, date=${this.props.date.toISOString().slice(0, 10)}`);
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
        if (this.state.enableEdit === true) {
          removeButton = <img className="w3-right" value={this.state.data.filenames[i]} src="./static/img/delete.png"
            style={{marginLeft: '1em', marginBottom: '0.66em', maxWidth: '1.25em'}}
            onClick={this.handleClickFileRemove.bind(this, this.state.data.filenames[i])} />;
        }
        if (this.state.enableEdit === true) {
          if (this.state.renameModeFile != this.state.data.filenames[i]) {
            renameButton = <img className="w3-right" value={this.state.data.filenames[i]}
              src="./static/img/rename.png" style={{maxWidth: '1.25em'}}
              onClick={this.handleClickEnableRenameMode.bind(this, this.state.data.filenames[i])} />;
          } else {
            renameButton = <button className="w3-right"
              onClick={this.handleClickSubmitNewFilename.bind(this, this.state.newFileName)}>完成</button>;
            filenameDisplay = <input type="text" style={{width: '100%'}}
              value={this.state.newFileName} onChange={this.handleNewFilenameChange}></input>;
          }
        }
        filenames[i] = (
          <li key={i} style={{paddingLeft: '0.2em', paddingRight: '0.2em'}}>
            <div className="w3-cell-row">
              <div className="w3-container w3-cell" style={{maxWidth: '65vw', wordWrap: 'break-word'}}>
                <div value={this.state.data.filenames[i]} >
                  {filenameDisplay}
                </div>
              </div>
              <div className="w3-container w3-cell">
                {removeButton}
                {renameButton}
              </div>
            </div>
          </li>
        );
      }
    }

    let progressBar = null;
    if (this.state.uploadProgress === null) {
    } else {
      progressBar = <span>（上传进度：{this.state.uploadProgress}%）</span>;
    }

    let uploadButton = null;
    if (this.state.enableUpload === true) {
      uploadButton = <div>
        <input id="input-fileupload-attachment" onChange={this.onFileChange} type="file" style={{display: 'none'}}>
        </input>
        <button id="button-addfile-attachment"
          className="w3-button w3-border w3-highway-green w3-right w3-marginBottom input-button"
          style={{clear: 'right'}} onClick={this.handleUploadAttachmentButtonClick}>
          {/* without clear: right, a button will interfere other buttons, causing other buttons to be left to it */}
          上传附件
        </button>
        {/* button and input is bound using jQuery... */}
      </div>;
    }
    return (
      <div>
        <ul className="w3-ul">
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
    console.log(`MealPlanDailyAttachments initialized`);
  }

  render() {
    console.log(`MealPlanDailyAttachments's date: ${this.props.date}`);
    return (
      <div>
        <div>
          <p className="w3-text-green p-mealplanitem-title">
            <b>附件</b>
          </p>
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
