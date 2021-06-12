class PlanTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      date: props.date
   //   data: props.data
    };
  }

  render() {
    if (this.props.data === null) { return null; }

    return (
      <div style={{ width: "98%", "max-width": "1000px", margin: "auto", "margin-top": "4em", "margin-bottom": "4em" }}>
          <MealPlanItem data={this.props.data} itemName="breakfast" sendData={this.getData} />
          <MealPlanItem data={this.props.data} itemName="morning_extra_meal" sendData={this.getData} />
          <MealPlanItem data={this.props.data} itemName="lunch" sendData={this.getData} />
          <MealPlanItem data={this.props.data} itemName="afternoon_extra_meal" sendData={this.getData} />
          <MealPlanItem data={this.props.data} itemName="dinner" sendData={this.getData} />
          <MealPlanItem data={this.props.data} itemName="evening_extra_meal" sendData={this.getData} />
          <MealPlanDailyRemark data={this.props.data} sendData={this.getData} />
          <MealPlanDailySelfie enableUpload={false} date={new Date(this.props.data.metadata.date)} />
          <MealPlanDailyAttachments enableEdit={false} enableUpload={false} date={new Date(this.props.data.metadata.date)} />
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
    logUserActivity('[meal-planner/history-plans] ' + this.state.data.metadata.date, this.state.data.metadata.username);
  }

  handlePreviousClick(event) {
    let yesterday = new Date(this.state.date);
    yesterday.setDate(yesterday.getDate() - 1);
    this.setState(prevState => ({
      date: yesterday
    }));
    this.fetchDataFromServer(yesterday);
    logUserActivity('[meal-planner/history-plans] ' + this.state.data.metadata.date, this.state.data.metadata.username);
  }
  
  handleNextClick(event) {
    let tomorrow = new Date(this.state.date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.setState(prevState => ({
      date: tomorrow
    }));
    this.fetchDataFromServer(tomorrow);
    logUserActivity('[meal-planner/history-plans] ' + this.state.data.metadata.date, this.state.data.metadata.username);
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
        textAreaAdjust();
        logUserActivity('[meal-planner/history-plans] ' + response.data.metadata.date, response.data.metadata.username);
        // Note that you canNOT use this.state.data instead of response.data here.
        // The reason, as I understand, is that setState() is an asynchronous function so you could get null if you use
        // this.state.data right after calling the setState() method.
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
    return (
    <div>
      <div class="fixed-header">
        <h5>食谱历史记录</h5>
      </div>
      <PlanTable data={this.state.data} />
      <FixedFooter date={this.state.date} sendData={this.getData} />
    </div>
    );
  }
}

ReactDOM.render(
  // A hacky way of getting UTC+8...
  <App date={new Date(new Date().getTime() + (8*60*60*1000))} />,
  document.getElementById('root')
);