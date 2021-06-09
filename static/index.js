// A hacky way of getting UTC+8...
const today = new Date(new Date().getTime() + (8*60*60*1000));
const yesterday = new Date(today);
const tomorrow = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
tomorrow.setDate(tomorrow.getDate() + 1);

ReactDOM.render(
  <div>
    <CheckHistoricalPlans />
    <MealPlan show={false} convenientDateName="昨日" date={yesterday}  />
    <MealPlan show={true}  convenientDateName="今日" date={today} />
    <MealPlan show={false} convenientDateName="明日" date={tomorrow} />
    <Notes show={false} />
    <Blacklist show={false} />
  </div>,
  document.getElementById('root')
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function textAreaAdjust() {
  // As long as the function is decorated as async and there is a sleep() call,
  // this function can adjust the height of textarea successfully.
  await sleep(1);
  $('textarea').each(
    function(){  
      $(this)[0].style.height = "inherit";
      $(this)[0].style.height = (2 + $(this)[0].scrollHeight)+"px";
      // 1+ seems not enough in some cases, try 2+
    }
  );
}