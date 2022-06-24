import React from 'react';
import { createRoot } from 'react-dom/client';
const axios = require('axios').default;
const Reminder = require('./reminder.js').Reminder;
const History = require('./history.js').History;
const MealPlan = require('./mealplans.js').MealPlan;
const Notes = require('./notes').Notes;
const Blacklist = require('./blacklist.js').Blacklist;

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

    ReactDOM.render(
     
      
      document.getElementById('root')
    );
    
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
      <div className="w3-container w3-green">
        <h3>
          每日食谱
          <span className="w3-right" style={{"marginBottom": "1rem", "fontSize": "0.65em"}}>[{this.state.username}],
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

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(
  <div className="w3-container w3-responsive" style={{ "maxWidth": "50em", padding: "0.75rem", display: "block", "marginLeft": "auto", "marginRight": "auto" }}>
    <History appAddress={window.location.href} />
    <MealPlan id="0" appAddress={window.location.href} show={false} convenientDateName="昨日" date={yesterday}  />
    <MealPlan id="1" appAddress={window.location.href} show={true}  convenientDateName="今日" date={today} />
    <MealPlan id="2" appAddress={window.location.href} show={false} convenientDateName="明日" date={tomorrow} />
    <Notes appAddress={window.location.href} show={false} />
    <Blacklist appAddress={window.location.href}  show={false} />
    <Reminder appAddress={window.location.href} />
  </div>
);