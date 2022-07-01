import axios from 'axios';
import moment from 'moment';
import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import PropTypes from 'prop-types';

class TopNavBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loggedInUser: '无'
    };
    this.getLoggedInUser();
  }

  getLoggedInUser() {
    axios.get('./get-logged-in-user/')
        .then((response) => {
          this.setState({
            loggedInUser: response.data.username
          });
        })
        .catch((error) => {});
  }

  render() {
    return (
      <Navbar bg="primary" expand="sm" variant="dark">
        <Container>
          <Navbar.Brand href="./"><b>每日食谱</b></Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav>
              <Nav.Link href="./?page=notes" target="_blank">笔记</Nav.Link>
              <NavDropdown title={<span className="text-light my-auto">翻看</span>}>
                <NavDropdown.Item href="./?page=history-selfies" target="_blank">自拍</NavDropdown.Item>
                <NavDropdown.Item href="./?page=history-attachments" target="_blank">附件</NavDropdown.Item>
              </NavDropdown>
            </Nav>
            <Navbar.Collapse className="justify-content-end">
              <Navbar.Text>
                在线用户: &nbsp;[{this.state.loggedInUser}],&nbsp;<a href="./logout/">退出</a>
              </Navbar.Text>
            </Navbar.Collapse>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  }
}

class BottomNavBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currDate: new Date()
    };
    this.handleDateChange = this.handleDateChange.bind(this);
    this.handleDatePickerChange = this.handleDatePickerChange.bind(this);
  }

  handleDatePickerChange(event) {
    let newDate = new Date(event.target.value);
    if (newDate == 'Invalid Date') {
      newDate = new Date();
    }
    this.setState((prevState, props) => {
      if (props.onDateChanged !== null) {
        props.onDateChanged(newDate);
      } else {
        console.warn(`onDateChanged not set, no external components are notified on the date change`);
      }
      return {
        currDate: newDate
      };
    });
  }

  handleDateChange(delta) {
    this.setState((prevState, props) => {
      const newDate = new Date(prevState.currDate);
      newDate.setDate(newDate.getDate() + delta);
      if (props.onDateChanged !== null) {
        props.onDateChanged(newDate);
      } else {
        console.warn(`onDateChanged not set, no external components are notified on the date change`);
      }
      return {
        currDate: newDate
      };
    });
  }

  render() {
    return (
      <Navbar bg="primary" expand="lg" variant="dark" fixed="bottom">
        <Container>
          <Nav className="me-auto">
            <Nav.Link onClick={() => this.handleDateChange(-1)}>&nbsp;&nbsp;❰&nbsp;&nbsp;</Nav.Link>
          </Nav>
          <Nav className="mx-auto">
            <form action="./">
              <input type="date"
                value={moment(this.state.currDate).format('YYYY-MM-DD')}
                onChange={this.handleDatePickerChange} />
            </form>
          </Nav>
          <Nav className="ms-auto">
            <Nav.Link onClick={() => this.handleDateChange(1)}>&nbsp;&nbsp;❱&nbsp;&nbsp;</Nav.Link>
          </Nav>
        </Container>
      </Navbar>
    );
  }
}

BottomNavBar.propTypes = {
  onDateChanged: PropTypes.func,
  currDate: PropTypes.instanceOf(Date)
};


export {TopNavBar, BottomNavBar};
