
import React from 'react';
import {createRoot} from 'react-dom/client';
import Accordion from 'react-bootstrap/Accordion';
const Reminder = require('./reminder.js').Reminder;
const MealPlan = require('./mealplans.js').MealPlan;
const Notes = require('./notes').Notes;
const Blacklist = require('./blacklist.js').Blacklist;
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
    try {
      this.setState({
        currDate: new Date(event.target.value)
      });
    } catch {
      this.setState({
        currDate: new Date()
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
    return (
      <div>
        <Navbar bg="primary" expand="lg" variant="dark">
          <Container>
            <Navbar.Brand href="#home">每日食谱</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav>
                <Nav.Link href="./?page=history-selfies" target="_blank">自拍</Nav.Link>
                <Nav.Link href="./?page=history-attachments" target="_blank">附件</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
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
        <Navbar bg="primary" expand="lg" variant="dark" fixed="bottom">
          <Container>
            <Nav className="me-auto">
              <Nav.Link onClick={() => this.handleDateChange(-1)}>❰</Nav.Link>
            </Nav>
            <Nav className="mx-auto">
              <form action="./">
                <input type="date"
                  value={this.state.currDate.toISOString().substr(0, 10)} onChange={this.handleDatePickerChange} />
              </form>
            </Nav>
            <Nav className="ms-auto">
              <Nav.Link onClick={() => this.handleDateChange(1)}>❱</Nav.Link>
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
