const axios = require('axios').default;

class Reminder extends React.Component {
  constructor(props) {
    super(props); 
    this.state = {
      consecutiveAData: null,
      reminderData: null,
      show: false,
      second: 0,
      timeout: 5
    };
    this.handleClickMessageBoxOK = this.handleClickMessageBoxOK.bind(this);
    
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }


  tick() {
    this.setState(prevState => ({
      second: prevState.second + 1
    }));
    if (this.state.second >= 5) {
      clearInterval(this.timerID);
    }
  }
  

  fetchDataFromServer() {
    axios.get('https://monitor.sz.lan/meal-planner/get-reminder-message/')
      .then(response => {
        this.setState({
          reminderData: null
          // make it empty before fill it in again to force a re-rendering.
        });
        this.setState({
          reminderData: response.data,
          show: response.data.message.length > 0
        });
        if (response.data.message.length > 0) {     
          this.setState({
            second: 0
          });  
          this.timerID = setInterval(
            () => this.tick(),
            1000
          );
        }
      })
      .catch(error => {
        alert('加载每日提醒失败！\n' + error);
      });

    axios.get('https://monitor.sz.lan/meal-planner/get-consecutive-a-days/')
      .then(response => {
        this.setState({
          consecutiveAData: null
          // make it empty before fill it in again to force a re-rendering.
        });
        this.setState({
          consecutiveAData: response.data
        });
        console.log(this.state.consecutiveAData);
      })
      .catch(error => {
        alert('加载全A天数失败！\n' + error);
      });
  }

  handleClickMessageBoxOK(event) {
    console.log('handleClickMessageBoxOK');
    this.setState(prevState => ({
      show: !prevState.show
    }));
  }

  render() {
    
    if (this.state.reminderData === null || this.state.consecutiveAData == null) { return null; }
    let aDays = this.state.consecutiveAData;
    let messageBox = (
      <div id="msg-box" className="w3-modal" style={{ display: this.state.show ? "block" : "none "}}>
        <div className="w3-modal-content w3-animate-top">
          <header className="w3-container w3-green"> 
            <h4>提醒</h4>
          </header>
          <div className="w3-container">
            <p style={{ "fontSize": "large" }}>{this.state.reminderData.message}</p>
            <div style={{ "fontSize": "large", "textAlign": "center" }}>
              <p>
                全A({Math.max(...aDays.a_only)})：<span style={{ "fontSize": "xx-large" }}>{aDays.a_only[0]}, </span>
                {/* Without "..." (called a spread operator) you get an NaN since it considers the array as one parameter.
                    By adding ..., max() considers it to be an array. */}
                {aDays.a_only.slice(1, 6).map((day) => <span>{day}, </span>)}
                {/* slice(1, 7) turns out to be too long on smaller screens. */}
              </p>
              <p>
                含A-({Math.max(...aDays.a_minus_included)})：<span style={{ "fontSize": "xx-large" }}>{aDays.a_minus_included[0]}, </span>
                {aDays.a_minus_included.slice(1, 6).map((day) => <span>{day}, </span> )}
              </p>
            </div>
            <p>
              <button id="button-okay" onClick={this.handleClickMessageBoxOK} className="w3-right w3-button w3-green"
                      disabled={(this.state.timeout - this.state.second) > 0}>
                确定({this.state.timeout - this.state.second})
              </button>
            </p>
          </div>
        </div>
      </div>
    );

    return ( 
      <div> 
        {messageBox}
      </div> 
    );
  } 
}

export { Reminder };