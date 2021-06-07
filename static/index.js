class MealPlanItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      itemName: props.itemName
    };
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    console.log('From MealPlanItem, change detected: ' + this.state.itemName + ' changed to: '+ event.target.value);
    var currentData = this.state.data;
    currentData[this.state.itemName].content = event.target.value;
    /* The issue is, React.js's setState() cannot handle nested properties so here we
       create a new instance and send back the instance as a whole. */
    this.props.sendData(this.state.itemName, currentData);
  }

  render() {
    return (
      <div>
        <div>
          <p class="w3-text-green p-mealplanitem-title">
            <b>{this.state.data[this.state.itemName].title}</b>
          </p>
        </div>
        <div class="w3-cell-row">
          <div class="w3-cell">
            <textarea class="w3-input textarea-mealplanitem" rows="1" onChange={this.handleChange}>
              {this.state.data[this.state.itemName].content}
            </textarea>
          </div>
          <div class="w3-cell">
            <select class="w3-select" value={this.state.data[this.state.itemName].feedback}>
              /* If value matches nothing, seems that React.js will simply select the first itm.*/
              <option class="w3-text-black" selected value="待填">待填</option>
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
    super(props);
    this.state = {
      date: props.date,
      data: null /* Will be initialized in componentDidMount() */
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.getData = this.getData.bind(this);
  }

  getData(itemName, value){
    // do not forget to bind getData in constructor
    console.log('From MealPlan, change detected: ' + itemName + ' changed to: ' + value);
    this.setState({ data: value });
    console.log(this.state.data);
  }

  handleSubmit(event) {
    console.log(this.state.data);
    axios.get('https://monitor.sz.lan/stock-analysis/?stock_symbol=' + this.state.stockSymbol)
      .then(function (response) {
        // handle success
        console.log("Success:");
        console.log(response);
      })
      .catch(function (error) {
        // handle error
        console.log("error:\n" + error);
      })
      .finally(function () {
        // always executed
        console.log("always!");
    });
    event.preventDefault();
  }

  componentDidMount() {
    let currentComponent = this;
    axios.get('https://monitor.sz.lan/meal-planner/get-meal-plan/?date=' + this.state.date)
      .then(function (response) {
        // handle success
        console.log("Success:");
        console.log(response.data);
        currentComponent.setState({
          data: response.data
        });
      })
      .catch(function (error) {
        alert('加载食谱项目失败！请关闭窗口后重试！');
      });
  }

  render() {
    if (this.state.data === null) { return null }
    return (
      <div>
        <div class="w3-hide w3-show w3-container w3-card-4">
          {/* The current implementation is that we are going to pass the entire json to each 
            MealPlanItem so that it would be easier to handle while MealPlanItem sends data back */}
          <MealPlanItem data={this.state.data} itemName="breakfast" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="morning_extra_meal" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="lunch" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="afternoon_extra_meal" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="dinner" sendData={this.getData} />
          <MealPlanItem data={this.state.data} itemName="evening_extra_meal" sendData={this.getData} />
          <div><p class="w3-text-green p-mealplanitem-title"><b>今日备注</b></p></div>
          <div class="w3-cell-row">
            <div class="w3-cell">
            <textarea class="w3-input textarea-dailyremark" rows="8">{this.state.data.daily_remark}</textarea>
            </div>
          </div>
          <div>
            <form onSubmit={this.handleSubmit}>
              <input class="w3-button w3-border w3-highway-green w3-right w3-margin-bottom input-button" type="submit" value="提交" />
            </form>
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(

  <MealPlan date="2021-06-06" />,
  document.getElementById('root')
);
