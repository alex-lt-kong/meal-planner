import moment from 'moment';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Reminder} from './reminder';
const MealPlan = require('./mealplans.js').MealPlan;
const Blacklist = require('./blacklist.js').Blacklist;
import {TopNavBar} from './navbar';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Card from 'react-bootstrap/Card';


class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currDate: new Date(new Date().getTime())
    };
    this.handleDateChange = this.handleDateChange.bind(this);
    this.handleDatePickerChange = this.handleDatePickerChange.bind(this);
  }

  handleDatePickerChange(event) {
    const newDate = new Date(event.target.value);
    if (newDate == 'Invalid Date') {
      this.setState({
        currDate: new Date()
      });
    } else {
      this.setState({
        currDate: newDate
      });
    }
  }

  handleDateChange(delta) {
    this.setState((prevState) => {
      const newDate = new Date(prevState.currDate);
      newDate.setDate(newDate.getDate() + delta);
      return {
        currDate: newDate
      };
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
        <Navbar bg="primary" expand="lg" variant="dark" fixed="bottom">
          <Container>
            <Nav className="me-auto">
              <Nav.Link onClick={() => this.handleDateChange(-1)}>&nbsp;&nbsp;❰&nbsp;&nbsp;</Nav.Link>
            </Nav>
            <Nav className="mx-auto">
              <form action="./">
                <input type="date"
                  value={moment(this.state.currDate).format('YYYY-MM-DD')} onChange={this.handleDatePickerChange} />
              </form>
            </Nav>
            <Nav className="ms-auto">
              <Nav.Link onClick={() => this.handleDateChange(1)}>&nbsp;&nbsp;❱&nbsp;&nbsp;</Nav.Link>
            </Nav>
          </Container>
        </Navbar>
      </div>
    );
  }
}

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(<Index />);
