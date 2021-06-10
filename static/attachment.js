

class AttachmentsManager extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      date: props.date,
      enableEdit: props.enableEdit,
      enableUpload: props.enableUpload,
      uploadProgress: null
    };
    this.onFileUpload = this.onFileUpload.bind(this);
    this.handleClickFileName = this.handleClickFileName.bind(this);
    this.handleClickFileRemove = this.handleClickFileRemove.bind(this);
    this.handleClickFileRename = this.handleClickFileRename.bind(this);
    this.onFileChange = this.onFileChange.bind(this);
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
      //alert(this.state.date.toISOString().slice(0, 10) + '的附件[' +selected_file.name + ']上传成功！');
      // an alert is not needed since the user will see the change of the files list.
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
  }

  handleClickFileRemove(value) {
    axios.get('https://monitor.sz.lan/meal-planner/remove-attachment/?date=' + this.state.date.toISOString().slice(0, 10) + '&filename=' + value)
      .then(response => {
      //  alert('文件[' + value + ']删除成功！');
      // an alert is not needed since the user will see the change of the files list.
        this.fetchDataFromServer();
      })
      .catch(error => {
        alert('文件[' + value + ']删除成功失败！\n' + error);
      });
  }
  
  handleClickFileRename(value) {
    console.log('handleClickFileRename:' + value);
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
        console.log(this.state.data);
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
        if (this.state.enableEdit === true) {
          removeButton = <span class="w3-bar-item w3-right" value={this.state.data.filenames[i]} 
                               onClick={this.handleClickFileRemove.bind(this, this.state.data.filenames[i])}>&times;</span>;
        }
        if (this.state.enableEdit === true) {
          renameButton = <span class="w3-bar-item w3-right" value={this.state.data.filenames[i]} 
                               onClick={this.handleClickFileRename.bind(this, this.state.data.filenames[i])}>🖊️</span>;
        }
        filenames[i] = (
        <li key={i} class="w3-bar" >
          {removeButton}
          {renameButton}       
          <div class="w3-bar-item" value={this.state.data.filenames[i]} 
            onClick={this.handleClickFileName.bind(this, this.state.data.filenames[i])}>
              <a href="javascript:;" style={{"text-decoration": "none"}} >{this.state.data.filenames[i]}</a>
              {/* href="javascript:;" a link that goes to nowhere */}
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
      uploadButton = <input type="file" onChange={this.onFileChange} />;
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