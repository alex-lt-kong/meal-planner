class Notes extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      show: props.show,
      data: null /* Will be initialized in componentDidMount() */
    };
    this.handleClickUpdate = this.handleClickUpdate.bind(this);
    this.handleClickHistory = this.handleClickHistory.bind(this);
    this.handleAccordionClick = this.handleAccordionClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    var currentData = this.state.data;
    currentData.content = event.target.value;
    this.setState({
      data: null
    });
    this.setState({
      data: currentData
    });
  }

  fetchDataFromServer() {
    axios.get('./get-notes/')
      .then(response => {
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
        alert('健康笔记加载失败！请关闭窗口后重试！\n' + error);
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

  handleClickHistory(event) {
    logUserActivity('[meal-planner] Open history-notes', this.state.data.metadata.username);
    window.open('./history-notes/');
  }

  handleClickUpdate(event) {
    const payload = new FormData();
    payload.append('data', JSON.stringify(this.state.data));
    axios({
      method: "post",
      url: "https://monitor.sz.lan/meal-planner/update-notes/",
      data: payload,
    })
    .then(response => {
      alert('健康笔记更新成功！');
      logUserActivity('[meal-planner] Submit new notes', this.state.data.metadata.username);
      this.fetchDataFromServer();
      // Must make this call to ensure UI is refreshed.
    })
    .catch(error => {
      console.log(error);
      alert('健康笔记更新错误：\n' + error);
      // You canNOT write error.response or whatever similar here.
      // The reason is that this catch() catches both network errors and other errors,
      // which may or may not have a response property.
    });
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }

  render() {
    
    if (this.state.data === null) { return null; }
    // So that if data is still not filled, an empty GUI will not be rendered.
    return (
      <div class="accordion" >
        <button onClick={this.handleAccordionClick} class="w3-button w3-block w3-left-align w3-green">
          健康笔记<span class="w3-right">{this.state.show ? "▴" : "▾"}</span>
        </button>
        <div className={`w3-container w3-card-4 ${this.state.show ? "w3-show" : "w3-hide"}`}>
          <textarea class="w3-input textarea-dailyremark" rows="3" onChange={this.handleChange}>
            {this.state.data.content}
          </textarea>
          <div>
            <div style={{ "margin-bottom": "-0.5em" }}>(最后更新：{new Date(this.state.data.date).toISOString().slice(0, 10)})</div>
            {/* set the margin-bottom to -0.5em so that the following two buttons can use exactly same settings. */}
            <button onClick={this.handleClickUpdate} class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button">更新</button>   
            <button onClick={this.handleClickHistory} class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button">翻看历史笔记</button>   
          </div>
        </div>
      </div>
    );
  }
}