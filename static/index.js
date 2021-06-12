// A hacky way of getting UTC+8...
const today = new Date(new Date().getTime() + (8*60*60*1000));
const yesterday = new Date(today);
const tomorrow = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
tomorrow.setDate(tomorrow.getDate() + 1);


ReactDOM.render(
  <div> 
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