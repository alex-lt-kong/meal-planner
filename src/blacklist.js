import React from 'react';
const axios = require('axios').default;


class Blacklist extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      show: props.show,
      data: null /* Will be initialized in componentDidMount() */
    };
    this.handleClickUpdate = this.handleClickUpdate.bind(this);
    this.handleAccordionClick = this.handleAccordionClick.bind(this);
    this.handleChangeBannedItems = this.handleChangeBannedItems.bind(this);
    this.handleChangeLimitedItems = this.handleChangeLimitedItems.bind(this);
  }
  
  handleChangeBannedItems(event) {
    var currentData = this.state.data;
    currentData.banned_items = event.target.value;
    this.setState({
      data: currentData
    });
  }
  
  handleChangeLimitedItems(event) {
    var currentData = this.state.data;
    currentData.limited_items = event.target.value;
    this.setState({
      data: currentData
    });
  }

  fetchDataFromServer() {
    axios.get('./get-blacklist/')
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
        alert('黑名单加载失败！请关闭窗口后重试！\n' + error);
      });
  }

  handleClickUpdate(event) {
    const payload = new FormData();
    payload.append('data', JSON.stringify(this.state.data));
    axios({
      method: "post",
      url: "./update-blacklist/",
      data: payload,
    })
        .then(response => {
          alert('黑名单更新成功！');
        })
        .catch(error => {
          console.log(error);
          alert('黑名单更新错误！\n' + error);
          // You canNOT write error.response or whatever similar here.
          // The reason is that this catch() catches both network error and other errors,
          // which may or may not have a response property.
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

  componentDidMount() {
    this.fetchDataFromServer();
  }

  render() {
    if (this.state.data === null) { return null; }

    return (
      <div className="accordion" >
        <button onClick={this.handleAccordionClick} className="w3-button w3-block w3-left-align w3-green">
          黑名单
          <span className="w3-right">{this.state.show ? "▴" : "▾"}</span>
        </button>
        <div className={`w3-container w3-card-4 ${this.state.show ? "w3-show" : "w3-hide"}`}>
          <p style={{color: "#ff0000", "marginBottom": "0.2em" }}><b>避免</b>食用</p>
          <textarea className="w3-input" value={this.state.data.banned_items} style={{ "marginBottom": "2em" }} rows="3" onChange={this.handleChangeBannedItems} />
          <p style={{ color: "#f2552c", "marginBottom": "0.2em" }}><b>谨慎</b>食用</p>
          <textarea className="w3-input" value={this.state.data.limited_items} rows="3" onChange={this.handleChangeLimitedItems} />
          <div>
            <button className="w3-button w3-border w3-highway-green w3-right w3-marginBottom input-button" onClick={this.handleClickUpdate} >
            提交
            </button>        
          </div>
        </div>
      </div>
    );
  }
}

export { Blacklist };