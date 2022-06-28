import React from 'react';
import {createRoot} from 'react-dom/client';
import {Reminder} from './reminder';
const MealPlan = require('./mealplans.js').MealPlan;
const Blacklist = require('./blacklist.js').Blacklist;
import {TopNavBar, BottomNavBar} from './navbar';
import Card from 'react-bootstrap/Card';


class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currDate: new Date()
    };
    this.onDateChangeReceived = this.onDateChangeReceived.bind(this);
  }

  onDateChangeReceived(newDate) {
    console.log(`newDate received ${newDate}`);
    this.setState({
      currDate: newDate
    });
  }

  render() {
    console.log((new Date()).toISOString());
    return (
      <div>
        <TopNavBar />
        <div style={{
          maxWidth: '50em', padding: '0.75rem', display: 'block',
          marginLeft: 'auto', marginRight: 'auto', marginBottom: '3em'
        }}>
          <Card border="primary">
            <Card.Body>
              <MealPlan date={this.state.currDate} />
            </Card.Body>
          </Card>
        </div>
        <Reminder />
        <BottomNavBar onDateChanged={this.onDateChangeReceived} />
      </div>
    );
  }
}

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(<Index />);
