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
      $(this)[0].style.height = (2 + $(this)[0].scrollHeight)+"px";
      // 1+ seems not enough in some cases, try 2+
    }
  );
}

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
    axios.post("./upload-selfie/", payload)
    .then(response => {
    // an alert is not needed since the user will see the change of the thumbnail.
    console.log('eal-planner] Upload selfi');
    logUserActivity('[meal-planner] Upload selfie', this.state.data.metadata.username);
    this.forceUpdate();
    // This forceUpdate() is needed so that the new image will be shown
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

    var buttonUpload = null;
    if (this.state.enableUpload === true) {
      buttonUpload = (
      <div style={{ "margin-bottom": "3em" }}>
        <button class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button"
                onClick={this.handleUploadSelfieButtonClick}>
          上传自拍
        </button>
        <input id="input-fileupload-selfie" onChange={this.onFileChange} type="file" style={{ display: "none" }} accept="image/png, image/gif, image/jpeg" />
        {/* button and input is bound using jQuery... */}
      </div>);
    }

    return ( 
      <div> 
        <div>
          <p class="w3-text-green p-mealplanitem-title">
            <b>自拍</b>
          </p>          
        </div>
          <div>
          <img src={`https://monitor.sz.lan/meal-planner/get-selfie/?date=${this.state.date.toISOString().slice(0, 10)}&${new Date().getTime()}`} alt=""
               style={{ display: "block", "margin-left": "auto", "margin-right": "auto", "max-width": "100%", width: "300px" }} />
          {/* If alt="" is added, the broken image icon won't show if src is not found. */}
          </div>
          {buttonUpload}
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
    currentData.remark.content = event.target.value;
    /* The issue is, React.js' setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
    if (this.props.sendData != null) {
      this.props.sendData(currentData);
    }
  }

  render() {
    let modificationInfo;
    if (this.state.data.remark.modification_type == 0) {
      modificationInfo = <span style={{ color: 'red', fontWeight: 'bold' }}> - 与昨日完全相同！</span>;
    }

    return (
      <div>
        <div><p class="w3-text-green p-mealplanitem-title"><b>备注</b>{modificationInfo}</p></div>
        <div class="w3-cell-row">
          <div class="w3-cell">
            <textarea class="w3-input textarea-dailyremark" rows="3" onChange={this.handleChange} readOnly={this.props.sendData == null}>
              {this.state.data.remark.content}
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
    event.target.style.height = 'inherit';
    event.target.style.height = `${event.target.scrollHeight}px`; 

    var currentData = this.state.data;
    currentData[this.state.itemName].content = event.target.value;
    /* The issue is, React.js' setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
    if (this.props.sendData != null) {
      this.props.sendData(currentData);
    }
  }

  handleFeedbackChange(event) {
    var currentData = this.state.data;
    currentData[this.state.itemName].feedback = event.target.value;
    /* The issue is, React.js' setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
    if (this.props.sendData != null) {
      this.props.sendData(currentData);
    }
  }

  render() {
    const modType = this.state.data[this.state.itemName].modification_type;
    let modificationInfo = null;
    let prettyDiff;
    if (modType == 1) {
      modificationInfo = <span> - 安全</span>;
    } else if (modType == 2) {
      modificationInfo = <span style={{color: "red", "font-weight": "bold"}}> - 危险!</span>;

      let previousText = this.state.data[this.state.itemName].prev;
      let currentText = this.state.data[this.state.itemName].content;
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
      
      var dmp = new diff_match_patch();
      var diff = dmp.diff_main(previousText, currentText);
      prettyDiff = (
        <span style={{ "margin-left": "0.5em", "font-size": "12px"}}>
          <b>对照：</b>
          <span dangerouslySetInnerHTML={{__html: dmp.diff_prettyHtml(diff)}} />
        </span>);
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
          <h5 class="w3-text-green p-mealplanitem-title">
            <b>{this.state.data[this.state.itemName].title}</b>
            {modificationInfo}
          </h5>          
        </div>
        <div class="w3-cell-row">
          <div class="w3-cell" style={{ "font-size": "14px"}}>
            <textarea class="w3-input textarea-mealplanitem" rows="1" readOnly={this.props.sendData == null}
                      onInput={this.handleContentChange}>
              {this.state.data[this.state.itemName].content}
            </textarea>           
          </div>
          <div class="w3-cell" style={{ 'max-width': '3em' }}>
          {/* max-width canNOT be too small since some users will enlarge the UI to 125% */}
            <select class="w3-select" style={feedbackStyle} value={this.state.data[this.state.itemName].feedback}
                    onChange={this.handleFeedbackChange} readOnly={this.props.sendData == null} >
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
        {prettyDiff}
      </div>
    );
  }
}