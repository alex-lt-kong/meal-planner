import React from 'react';
const axios = require('axios').default;
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
} from 'chart.js';
import {Line} from 'react-chartjs-2';
import 'chartjs-adapter-luxon';

class Reminder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dailyACount: null,
      reminderData: null,
      show: false
    };
    this.handleClickMessageBoxOK = this.handleClickMessageBoxOK.bind(this);
  }

  componentDidMount() {
    this.fetchDataFromServer(121);
  }

  fetchDataFromServer(days) {
    axios.get(`./get-daily-a-count/?days=${days}`)
        .then((response) => {
          this.setState({dailyACount: response.data});
        })
        .catch((error) => {
          alert(`加载每日A数失败！\n原因：${error}`);
        });
    axios.get('./get-reminder-message/')
        .then((response) => {
          this.setState({
            reminderData: response.data,
            show: response.data.message.length > 0
          });
        })
        .catch((error) => {
          alert(`加载每日提醒失败！\n原因：${error}`);
        });
  }

  handleClickMessageBoxOK(event) {
    this.setState((prevState) => ({show: !prevState.show}));
  }

  render() {
    if (this.state.reminderData === null || this.state.dailyACount == null) {
      return null;
    }

    ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Tooltip
    );
    const options = {
      responsive: true,
      scales: {
        xAxis: {
          grid: {display: false},
          type: 'time',
          time: {
            parser: 'yyyy-MM-dd',
            displayFormats: {
              'day': 'yyyy-MM-dd',
              'month': 'yyyy-MM'
            },
            tooltipFormat: 'yyyy-MM-dd'
          },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0,
            maxTicksLimit: 4
          },
          display: true
        },
        yAxis: {
          grid: {display: true},
          ticks: {beginAtZero: false}
        }
      },
      plugins: {
        legend: {display: false}
      }
    };
    const data = {
      labels: this.state.dailyACount.date,
      datasets: [
        {
          label: '原始数据',
          data: this.state.dailyACount.value,
          borderColor: 'rgb(53, 168, 40, 0.75)',
          backgroundColor: 'rgba(53, 168, 40, 0.25)',
          borderWidth: 0.8,
          tension: 0.1,
          pointRadius: 0
        },
        {
          label: '移动平均',
          data: this.state.dailyACount.value_ma,
          borderColor: 'rgb(53, 168, 40)',
          backgroundColor: 'rgba(53, 168, 40, 0.75)',
          borderWidth: 4.5,
          tension: 0.5,
          pointRadius: 0.25
        }
      ]
    };

    const messageBox = (
      <div id="msg-box" className="w3-modal" style={{display: this.state.show ? 'block' : 'none'}}>
        <div className="w3-modal-content w3-animate-top">
          <header className="w3-container w3-green">
            <h4>提醒</h4>
          </header>
          <div className="w3-container">
            <p style={{fontSize: 'large'}}>{this.state.reminderData.message}</p>
            <div style={{fontSize: 'large', textAlign: 'center'}}>
              <Line options={options} data={data} />
            </div>
            <div style={{textAlign: 'center'}}>
              <input id="days-radio-button-0" className="w3-radio" type="radio"
                name="days-radio-button" onClick={() => this.fetchDataFromServer(30)} />
              <label htmlFor="days-radio-button-0" style={{marginRight: '1em'}}>1月</label>
              <input id="days-radio-button-1" className="w3-radio" type="radio" defaultChecked={true}
                name="days-radio-button" onClick={() => this.fetchDataFromServer(121)} />
              <label htmlFor="days-radio-button-1" style={{marginRight: '1em'}}>4月</label>
              <input id="days-radio-button-2" className="w3-radio" type="radio"
                name="days-radio-button" onClick={() => this.fetchDataFromServer(365)} />
              <label htmlFor="days-radio-button-2" style={{marginRight: '1em'}}>1年</label>
              <input id="days-radio-button-3" className="w3-radio" type="radio"
                name="days-radio-button" onClick={() => this.fetchDataFromServer(730)} />
              <label htmlFor="days-radio-button-3" style={{marginRight: '1em'}}>2年</label>
            </div>
            <p>
              <button id="button-okay" onClick={this.handleClickMessageBoxOK} className="w3-right w3-button w3-green">
                确定
              </button>
            </p>
          </div>
        </div>
      </div>
    );

    return (
      <div>
        {messageBox}
      </div>
    );
  }
}

export {Reminder};
