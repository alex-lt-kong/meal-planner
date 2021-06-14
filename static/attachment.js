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
    this.handleUploadAttachmentButtonClick = this.handleUploadAttachmentButtonClick.bind(this);  

  }

  onFileChange(event) { 
    this.setState({ 
      selectedFile: event.target.files[0]
    }); 
    if( event.target.files[0].size > 128000000){
      alert("上传的文件不可超过128MB");
      return;
    };
    this.onFileUpload(event.target.files[0]);
  }; 
   
  handleUploadAttachmentButtonClick(event) {
    $('#input-fileupload-attachment').click();
    // It is used to apply unified button style to file upload button...
    // It is jQuery...but ...it works!
  }

  onFileUpload(selected_file) {
    const payload = new FormData(); 
    payload.append('selected_file', selected_file); 
    var config = {
      onUploadProgress: function(progressEvent) {
          var percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
          if (percentCompleted < 100)
            this.setState({uploadProgress: percentCompleted}); //How set state with percentCompleted?
          else
            this.setState({uploadProgress: null});
      }.bind(this)
  };

    axios.post("https://monitor.sz.lan/meal-planner/upload-attachment/", payload, config)
    .then(response => {
      // an alert is not needed since the user will see the change of the files list.
      logUserActivity('[meal-planner] Upload attachment [' + selected_file.name +  '] to [' + this.state.data.metadata.date + ']',
                      this.state.data.metadata.username);
      this.fetchDataFromServer();
    })
    .catch(error => {
      console.log(error);
      alert('附件上传错误\n' + error);
      // You canNOT write error.response or whatever similar here.
      // The reason is that this catch() catches both network error and other errors,
      // which may or may not have a response property.
    });
  }

  handleClickFileName(value) {
    window.open('https://monitor.sz.lan/meal-planner/get-attachment/?date=' + this.state.date.toISOString().slice(0, 10) + '&filename=' + value);
    logUserActivity('[meal-planner] Download attachment [' + value +  '] from [' + this.state.date.toISOString().slice(0, 10) + ']',
                    this.state.data.metadata.username);
  }

  handleClickFileRemove(value) {
    axios.get('https://monitor.sz.lan/meal-planner/remove-attachment/?date=' + this.state.date.toISOString().slice(0, 10) + '&filename=' + value)
      .then(response => {
      // an alert is not needed since the user will see the change of the files list.
        this.fetchDataFromServer();
        logUserActivity('[meal-planner] Remove attachment [' + value +  '] from [' + this.state.data.metadata.date + ']',
        this.state.data.metadata.username);
      })
      .catch(error => {
        alert('文件[' + value + ']删除成功失败！\n' + error);
      });
  }
  
  handleClickSubmitNewFilename(value) {
      axios.get('https://monitor.sz.lan/meal-planner/rename-attachment/?date=' + this.state.date.toISOString().slice(0, 10) + 
      '&filename_old=' + this.state.renameModeFile + 
      '&filename_new=' + this.state.newFileName)
        .then(response => {
          logUserActivity('[meal-planner] Rename attachment from [' + this.state.renameModeFile + '](' + 
            this.state.date.toISOString().slice(0, 10) + ') to [' + this.state.newFileName + ']',
            this.state.data.metadata.username);
          // Need to logUserActivity() before setState()!
          this.setState({ 
            renameModeFile: null
          });
          this.fetchDataFromServer();
        })
        .catch(error => {
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
    this.setState({ 
      newFileName: event.target.value
    }); 
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }


  fetchDataFromServer() {
    axios.get('https://monitor.sz.lan/meal-planner/get-attachments-list/?date=' + this.state.date.toISOString().slice(0, 10))
      .then(response => {
        // handle success
        this.setState({
          data: null
          // make it empty before fill it in again to force a re-rendering.
        });
        this.setState({
          data: response.data
        });
      })
      .catch(error => {
        alert(this.state.date.toISOString().slice(0, 10) + '的附件列表加载失败！请关闭窗口后重试！\n' + error);
      });
  }
  
  render() {

    if (this.state.data === null) { return null; }

    var filenames = new Array(0);
    let i = 0;
    if (this.state.data.filenames === null) {  }
    else {
      filenames = new Array(this.state.data.filenames.length);
      for (i = 0; i < this.state.data.filenames.length; i++) {
        var removeButton = null;
        var renameButton = null;
        var filenameDisplay = <a href="javascript:;" onClick={this.handleClickFileName.bind(this, this.state.data.filenames[i])}
                                 style={{"text-decoration": "none", width: "100%"}} >{this.state.data.filenames[i]}</a>;
                                 /* href="javascript:;" a link that goes to nowhere */;
        if (this.state.enableEdit === true) {
          removeButton = <img class="w3-right" value={this.state.data.filenames[i]} src="./static/delete.png"
                              style={{ "margin-left": "1em", "margin-bottom": "0.66em", "max-width": "1.25em" }}
                              onClick={this.handleClickFileRemove.bind(this, this.state.data.filenames[i])} />;
        }
        if (this.state.enableEdit === true) {
          if (this.state.renameModeFile != this.state.data.filenames[i]) {
            renameButton = <img class="w3-right" value={this.state.data.filenames[i]} src="./static/rename.png" style={{ "max-width": "1.25em" }}
                                onClick={this.handleClickEnableRenameMode.bind(this, this.state.data.filenames[i])} />;

          } else {
            renameButton = <button class="w3-right" 
                                   onClick={this.handleClickSubmitNewFilename.bind(this, this.state.newFileName)}>完成</button>;
            filenameDisplay = <input type="text" style={{ width: "100%"}} value={this.state.newFileName} onChange={this.handleNewFilenameChange}></input>;
          }
        }
        filenames[i] = (
        <li key={i} style={{ "padding-left": "0.2em", "padding-right": "0.2em" }}>
          <div class="w3-cell-row">
            <div class="w3-container w3-cell" style={{ "max-width": "65vw", "word-wrap": "break-word" }}>
              <div value={this.state.data.filenames[i]} >
                {filenameDisplay}              
              </div>
            </div>
            <div class="w3-container w3-cell">
              {removeButton}
              {renameButton}  
            </div>
          </div>
        </li>
        );
      }
    }

    var progressBar = null;
    if (this.state.uploadProgress === null) {}
    else{
      progressBar = <span>（上传进度：{this.state.uploadProgress}%）</span>;
    }

    var uploadButton = null;
    if (this.state.enableUpload === true) {
      uploadButton = <div>
                      <button id="button-addfile-attachment" class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button" 
                              onClick={this.handleUploadAttachmentButtonClick}>
                        上传附件
                      </button>
                      <input id="input-fileupload-attachment" onChange={this.onFileChange} type="file" style={{ display: "none" }}></input>
                      {/* button and input is bound using jQuery... */}
                     </div>;
    }
    return ( 
      <div> 
        <ul class="w3-ul">
          {filenames}
        </ul>
        {uploadButton}
        {progressBar}
      </div> 
    );
  } 
}

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
          <p class="w3-text-green p-mealplanitem-title">
            <b>附件</b>
          </p>
        </div>
        <AttachmentsManager enableUpload={this.state.enableUpload} enableEdit={this.state.enableEdit} date={this.state.date} />
      </div>
    );
  }
}