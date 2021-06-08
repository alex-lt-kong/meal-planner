class PlanTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
   //   data: props.data
    };
  }

  render() {
    if (this.props.data === null) { return null; }
    // For whatever reason, this.props.data works here but this.state.data does not...
    let itemNames = ['breakfast', 'morning_extra_meal', 'lunch', 'afternoon_extra_meal', 'dinner', 'evening_extra_meal'];
    let items = [null, null, null, null, null, null];
    let i = 0;
    for (i = 0; i < itemNames.length; i++) {

      var modificationInfo = <span></span>;
      if (this.props.data[itemNames[i]].modification_type == 1) {
        modificationInfo = <span style={{ color: 'green' }}> - 安全的改动</span>;
      } else if (this.props.data[itemNames[i]].modification_type == 2) {
        modificationInfo = <span style={{ color: 'red', fontWeight: 'bold' }}> - 危险的改动！</span>;
      }

      items[i] = (<div>
        <div class="w3-panel w3-leftbar w3-border-green" style={{"margin-bottom": "0px"}}>
        <span style={{ "margin-left": "0.5em", fontWeight: 'bold' }}>{this.props.data[itemNames[i]].title}</span>{modificationInfo}
          <span style={{ "text-align": "right", float: "right", "margin-right": "1em" }}>{this.props.data[itemNames[i]].feedback}</span>
        </div>
        <hr style={{ "margin-top": "0px", "margin-bottom": "0.5em", "margin-left": "2em", "margin-right": "2em" }}></hr>
        <div style={{ "margin-left": "2em", "margin-right": "2em" }}>{this.props.data[itemNames[i]].content}</div>
      </div>);
    }

    return (
      <div style={{ "margin-top": "4em", "margin-bottom": "4em" }}>
        {items}
        <div>
          <div class="w3-panel w3-leftbar w3-border-green" style={{"margin-bottom": "0px"}}>
          <span style={{ "margin-left": "0.5em", fontWeight: 'bold' }}>今日备注</span>
          </div>
          <hr style={{ "margin-top": "0px", "margin-bottom": "0.5em", "margin-left": "2em", "margin-right": "2em" }}></hr>
          <div style={{ "margin-left": "2em", "margin-right": "2em", "white-space": "pre-wrap" }}>{this.props.data.daily_remark}</div>
        </div>
      </div>
      );
  }
}

class FixedFooter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      date: props.date
    };
    this.handleChange = this.handleChange.bind(this);
    this.handlePreviousClick = this.handlePreviousClick.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);
  }

  componentDidMount() {
    this.fetchDataFromServer(this.state.date);
  }

  handleChange(event) {
    this.setState({
      date: new Date(event.target.value)
    });
    this.fetchDataFromServer(new Date(event.target.value));
  }

  handlePreviousClick(event) {
    let yesterday = new Date(this.state.date);
    yesterday.setDate(yesterday.getDate() - 1);
    this.setState(prevState => ({
      date: yesterday
    }));
    this.fetchDataFromServer(yesterday);
    
  }
  
  handleNextClick(event) {
    let tomorrow = new Date(this.state.date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.setState(prevState => ({
      date: tomorrow
    }));
    this.fetchDataFromServer(tomorrow);
  }

  fetchDataFromServer(date) {
    // Seems that we canNOT use this.state.date here because the update of
    // state is not in real-time.
    axios.get('https://monitor.sz.lan/meal-planner/get-meal-plan/?date=' + date.toISOString().slice(0, 10))
      .then(response => {       
        this.setState({
          data: null
          // make it empty before fill it in again to force a re-rendering.
        });
        this.setState({
          data: response.data
        });
        this.props.sendData(this.state.data);
      })
      .catch(error => {
        alert(date.toISOString().slice(0, 10) + '的食谱项目加载失败！请关闭窗口后重试！\n' + error);
      });
  }

  render() {
    return (
      <div class="fixed-footer">
      <div class="w3-cell-row">
        <div class="w3-container w3-cell w3-cell-top">
          <p><a href="#" onClick={this.handlePreviousClick}>向前</a></p>
        </div>
        <div class="w3-container w3-cell w3-cell-middle">
          <form class="w3-center" action="./">
            <input type="date" 
            value={this.state.date.toISOString().substr(0,10)} onChange={this.handleChange} />
          </form>
        </div>
        <div class="w3-container w3-cell w3-cell-bottom">
          <p><a href="#" onClick={this.handleNextClick}>向后</a></p>
        </div>
      </div>
    </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      date: props.date
    };
    this.getData = this.getData.bind(this);
  }

  getData(value){
    this.setState({ data: null });
    this.setState({ data: value });
  }

  render() {
    // A hacky way of getting UTC+8...
  const today = new Date(new Date().getTime() + (8*60*60*1000));

    return (
    <div>
      <div class="fixed-header">
        <h5>食谱历史记录</h5>
      </div>
      <PlanTable date={today} data={this.state.data} />
      <FixedFooter date={today} sendData={this.getData} />
    </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);