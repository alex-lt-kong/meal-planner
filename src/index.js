import React from 'react';
import {createRoot} from 'react-dom/client';
const Reminder = require('./reminder.js').Reminder;
const History = require('./history.js').History;
const MealPlan = require('./mealplans.js').MealPlan;
const Notes = require('./notes').Notes;
const Blacklist = require('./blacklist.js').Blacklist;

// A hacky way of getting UTC+8...
const today = new Date(new Date().getTime() + (8*60*60*1000));
const yesterday = new Date(today);
const tomorrow = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
tomorrow.setDate(tomorrow.getDate() + 1);

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(
    <div className="w3-container w3-responsive"
      style={{maxWidth: '50em', padding: '0.75rem', display: 'block', marginLeft: 'auto', marginRight: 'auto'}}>
      <History appAddress={window.location.href} />
      <MealPlan id="0" appAddress={window.location.href} show={false} convenientDateName="昨日" date={yesterday}/>
      <MealPlan id="1" appAddress={window.location.href} show={true} convenientDateName="今日" date={today} />
      <MealPlan id="2" appAddress={window.location.href} show={false} convenientDateName="明日" date={tomorrow} />
      <Notes appAddress={window.location.href} show={false} />
      <Blacklist appAddress={window.location.href} show={false} />
      <Reminder appAddress={window.location.href} />
    </div>,
);
