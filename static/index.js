class IndexHeader extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: null,
    };
    this.onClickLogout = this.onClickLogout.bind(this);
  }

  onClickLogout(event) { 
    logUserActivity('[meal-planner/index] logout', '{{username}}');
    window.location.replace('../meal_planner/logout/');
  }; 

  fetchDataFromServer() {
    axios.get(window.location.href + 'get-username/')
      .then(response => {
        this.setState({
          username: response.data.username
        });
      })
      .catch(error => {});
  }
  
  componentDidMount() {
    this.fetchDataFromServer();    
  }

  render() {
    return (
      <div class="w3-container w3-green">
        <h3>
          每日食谱
          <span class="w3-right" style={{"margin-bottom": "1rem", "font-size": "0.65em"}}>[{this.state.username}],
            <a href="#" onClick={this.onClickLogout}>退出</a>
          </span>
        </h3>
      </div>  
    );
  }
}

// A hacky way of getting UTC+8...
const today = new Date(new Date().getTime() + (8*60*60*1000));
const yesterday = new Date(today);
const tomorrow = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
tomorrow.setDate(tomorrow.getDate() + 1);

ReactDOM.render(
  <div class="w3-container w3-responsive" style={{ "max-width": "50em", padding: "0.75rem", display: "block", "margin-left": "auto", "margin-right": "auto" }}>
    <IndexHeader />
    <History appAddress={window.location.href} />
    <MealPlan id="0" appAddress={window.location.href} show={false} convenientDateName="昨日" date={yesterday}  />
    <MealPlan id="1" appAddress={window.location.href} show={true}  convenientDateName="今日" date={today} />
    <MealPlan id="2" appAddress={window.location.href} show={false} convenientDateName="明日" date={tomorrow} />
    {/* id is used to identify when to show "沿用今日" */}
    <Notes appAddress={window.location.href} show={false} />
    <Blacklist appAddress={window.location.href}  show={false} />
    <Reminder appAddress={window.location.href} />
  </div>,
  document.getElementById('root')
);