
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


// A hacky way of getting UTC+8...
const today = new Date(new Date().getTime() + (8*60*60*1000));
const yesterday = new Date(today);
const tomorrow = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
tomorrow.setDate(tomorrow.getDate() + 1);

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(
    <div>
      <Navbar bg="primary" expand="lg" variant="dark">
        <Container>
          <Navbar.Brand href="#home">每日食谱</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav>
              <Nav.Link href="./?page=history-plans" target="_blank">食谱</Nav.Link>
              <Nav.Link href="./?page=history-selfies" target="_blank">自拍</Nav.Link>
              <Nav.Link href="./?page=history-attachments" target="_blank">附件</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <div style={{maxWidth: '50em', padding: '0.75rem', display: 'block', marginLeft: 'auto', marginRight: 'auto'}}>
        <Accordion defaultActiveKey="1">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              昨天的食谱({yesterday.toISOString().slice(0, 10)})
            </Accordion.Header>
            <Accordion.Body>
              <MealPlan id="0" appAddress={window.location.href} show={false} convenientDateName="昨日" date={yesterday}/>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="1">
            <Accordion.Header>
              今天的食谱({today.toISOString().slice(0, 10)})
            </Accordion.Header>
            <Accordion.Body>
              <MealPlan id="1" appAddress={window.location.href} show={true} convenientDateName="今日" date={today} />
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="2">
            <Accordion.Header>
              明天的食谱({tomorrow.toISOString().slice(0, 10)})
            </Accordion.Header>
            <Accordion.Body>
              <MealPlan id="2" appAddress={window.location.href} show={false} convenientDateName="明日" date={tomorrow} />
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
  </div>
);
