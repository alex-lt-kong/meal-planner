class MealPlanDailyAttachments extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      date: props.date,
      uploadProgress: null
    };
    this.onFileUpload = this.onFileUpload.bind(this);
    this.handleClickFileName = this.handleClickFileName.bind(this);
    this.handleClickFileRemove = this.handleClickFileRemove.bind(this);
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
    console.log('start uploading...')
    const payload = new FormData(); 
    payload.append('selected_file', selected_file); 
    console.log(selected_file); 

    var config = {
      onUploadProgress: function(progressEvent) {
          var percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
          if (percentCompleted < 100)
            this.setState({uploadProgress: percentCompleted}); //How set state with percentCompleted?
          else
            this.setState({uploadProgress: null});
      }.bind(this)
  };

    axios.post("./upload-attachment/", payload, config)
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
    window.open('./get-attachment/?date=' + this.state.date.toISOString().slice(0, 10) + '&filename=' + value);
  }

  handleClickFileRemove(value) {
    axios.get('./remove-attachment/?date=' + this.state.date.toISOString().slice(0, 10) + '&filename=' + value)
      .then(response => {
      //  alert('文件[' + value + ']删除成功！');
      // an alert is not needed since the user will see the change of the files list.
        this.fetchDataFromServer();
      })
      .catch(error => {
        alert('文件[' + value + ']删除成功失败！\n' + error);
      });
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }

  fetchDataFromServer() {
    axios.get('./get-attachments-list/?date=' + this.state.date.toISOString().slice(0, 10))
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
        console.log(this.state.data.filenames[i]);

        filenames[i] = (
        <li key={i} class="w3-display-container" >
            <div value={this.state.data.filenames[i]} 
            onClick={this.handleClickFileName.bind(this, this.state.data.filenames[i])}>{this.state.data.filenames[i]}</div>
          <span class="w3-button w3-display-right" value={this.state.data.filenames[i]} 
            onClick={this.handleClickFileRemove.bind(this, this.state.data.filenames[i])}>&times;</span>
        </li>
        );
      }
    }

    var progressBar = null;
    if (this.state.uploadProgress === null) {}
    else{
      progressBar = <span>（新附件上传进度：{this.state.uploadProgress}%）</span>;
    }
    
    return ( 
      <div> 
        <div>
          <p class="w3-text-green p-mealplanitem-title">
            <b>今日附件{progressBar}</b>
          </p>          
        </div>
        <ul class="w3-ul">
          {filenames}
        </ul>
        <input type="file" onChange={this.onFileChange} />
      </div> 
    );
  } 
}

class MealPlanDailySelfie extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      data: props.data,
      date: props.date
    };
    this.onFileChange = this.onFileChange.bind(this);
  }

  onFileChange(event) { 
    this.setState({ 
      selectedFile: event.target.files[0]
    }); 
    this.onFileUpload(event.target.files[0]);
  }; 
   
  onFileUpload(selected_file) {
    console.log('start uploading...')
    const payload = new FormData(); 
    payload.append('selected_file', selected_file); 
    console.log(selected_file); 
    axios.post("./upload-selfie/", payload)
    .then(response => {
    //  alert(this.state.date.toISOString().slice(0, 10) + '的自拍照上传成功！');
     // an alert is not needed since the user will see the change of the thumbnail.
    //  this.forceUpdate();
    })
    .catch(error => {
      console.log(error);
      alert('自拍照上传错误\n' + error);
      // You canNOT write error.response or whatever similar here.
      // The reason is that this catch() catches both network error and other errors,
      // which may or may not have a response property.
    });
  }
   
  render() { 
    return ( 
      <div> 
        <div>
          <p class="w3-text-green p-mealplanitem-title">
            <b>今日自拍</b>
          </p>          
        </div>
          <div>
          <img src={`./get-selfie/?date=${this.state.date.toISOString().slice(0, 10)}&${new Date().getTime()}`} alt=""
               style={{ display: "block", "margin-left": "auto", "margin-right": "auto", "max-width": "100%", width: "300px" }} />
          {/* If alt="" is added, the broken image icon won't show if src is not found. */}
          </div>
          <input type="file" accept="image/png, image/gif, image/jpeg" onChange={this.onFileChange} />
          {/* image/jpeg includes jpg and jpeg extensions. */}
      </div> 
    );
  } 
}

class MealPlanDailyRemark extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data
    };
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
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
    const modType = this.state.data[this.state.itemName].modification_type;
    let modificationInfo;
    if (modType == -1) {
      modificationInfo = <span style={{ color: 'black' }}> - 改动检测错误（请汇报该错误）</span>;
    } else if (modType == 1) {
      modificationInfo = <span> - 安全的改动</span>;
    } else if (modType == 2) {
      modificationInfo = <span style={{ color: 'red', fontWeight: 'bold' }}> - 危险的改动！</span>;
    }
    var feedbackColor = 'black'
    if (this.state.data[this.state.itemName].feedback === 'A') {
      feedbackColor = 'green';
    } else if (this.state.data[this.state.itemName].feedback === 'B+' || 
            this.state.data[this.state.itemName].feedback === 'B' ||
            this.state.data[this.state.itemName].feedback === 'C') {
      feedbackColor = 'red';
    }
    const feedbackStyle = {
      color: feedbackColor,
      fontWeight: 'bold'
    };
    return (
      <div>
        <div>
          <p class="w3-text-green p-mealplanitem-title">
            <b>{this.state.data[this.state.itemName].title}</b>
            {modificationInfo}
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
          
            <select class="w3-select" style={feedbackStyle} value={this.state.data[this.state.itemName].feedback} onChange={this.handleFeedbackChange} >
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
    this.state = {
      id: props.id,
      date: props.date,
      convenientDateName: props.convenientDateName,
      show: props.show,
      data: null /* Will be initialized in componentDidMount() */
    };

    this.handleClickUpdate = this.handleClickUpdate.bind(this);
    this.handleAccordionClick = this.handleAccordionClick.bind(this);
    this.handleCopyTodayClick = this.handleCopyTodayClick.bind(this);  
    this.getData = this.getData.bind(this);
  }

  getData(value){
    // do not forget to bind getData in constructor
    this.setState({ data: value });
  }

  fetchDataFromServer() {
    axios.get('./get-meal-plan/?date=' + this.state.date.toISOString().slice(0, 10))
      .then(response => {
        // handle success
        this.setState({
          data: null
          // make it empty before fill it in again to force a re-rendering.
        });
        this.setState({
          data: response.data
        });
        textAreaAdjust();
      })
      .catch(error => {
        alert(this.state.date.toISOString().slice(0, 10) + '的食谱项目加载失败！请关闭窗口后重试！\n' + error);
      });
  }

  handleCopyTodayClick(event) {
    let today = new Date(this.state.date);
    today.setDate(today.getDate() - 1);
    axios.get('./get-meal-plan/?date=' + today.toISOString().slice(0, 10))
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

  handleClickUpdate(event) {
    const payload = new FormData();
    payload.append('date', this.state.date.toISOString().slice(0, 10));
    payload.append('data', JSON.stringify(this.state.data));
    axios({
      method: "post",
      url: "./update-meal-plan/",
      data: payload,
    })
    .then(response => {
      alert(this.state.date.toISOString().slice(0, 10) + '的食谱更新成功！');
      this.fetchDataFromServer();
      // Must make this call to ensure UI is refreshed.
      console.log(response);
    })
    .catch(error => {
      console.log(error);
      alert('错误：\n' + error);
      // You canNOT write error.response or whatever similar here.
      // The reason is that this catch() catches both network error and other errors,
      // which may or may not have a response property.
    });
    event.preventDefault();
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }

  render() {
    
    if (this.state.data === null) { return null; }
    // So that if data is still not filled, an empty GUI will not be rendered.
    let buttonCopyToday;
    if (parseInt(this.state.id) === 2) {
      // Originally, I use convenientDateName === "明天" to achieve the same
      // However, it turns out that string comparison in Javascript is really strange...
      buttonCopyToday = <button class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button"
                                onClick={this.handleCopyTodayClick}>沿用今日</button>;
    }

    return (
      <div class="accordion" >
        <button onClick={this.handleAccordionClick} class="w3-button w3-block w3-left-align w3-green">
          {this.state.convenientDateName}食谱({this.state.date.toISOString().slice(0, 10)})
          <span class="w3-right">{this.state.show ? "▴" : "▾"}</span>
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
          <MealPlanDailySelfie date={this.state.date} />
          <MealPlanDailyAttachments date={this.state.date} />
          <div>
            <button class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button" onClick={this.handleClickUpdate}>
              提交
            </button>
            {buttonCopyToday}           
          </div>
        </div>
      </div>
    );
  }
}