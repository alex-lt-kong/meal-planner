const axios = require('axios').default;
import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

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
      show: true
    };
    this.handleClickMessageBoxOK = this.handleClickMessageBoxOK.bind(this);
  }

  componentDidMount() {
    this.fetchDataFromServer(60);
  }

  fetchDataFromServer(days) {
    axios.get(`./get-daily-a-count/?days=${days}`)
        .then((response) => {
          this.setState({dailyACount: response.data});
        })
        .catch((error) => {
          alert(`加载每日A数失败！原因：\n${(error.response !== undefined) ? JSON.stringify(error.response): error}`);
        });
    axios.get('./get-reminder-message/')
        .then((response) => {
          this.setState({
            reminderData: response.data,
            show: response.data.message.length > 0
          });
        })
        .catch((error) => {
          alert(`加载每日提醒失败！原因：\n${(error.response !== undefined) ? JSON.stringify(error.response): error}`);
        });
  }
  handleClickMessageBoxOK(event) {
    this.setState({show: false});
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
    return (
      <Modal show={this.state.show} size="lg" onHide={() => this.setState({show: false})} centered>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            统计
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Line options={options} data={data} />
          <div style={{textAlign: 'center', paddingTop: '1em'}}>
            <input id="days-radio-button-0" type="radio"
              name="days-radio-button" onClick={() => this.fetchDataFromServer(30)} />
            <label htmlFor="days-radio-button-0" style={{marginRight: '1em'}}>1月</label>
            <input id="days-radio-button-1" type="radio" defaultChecked={true}
              name="days-radio-button" onClick={() => this.fetchDataFromServer(60)} />
            <label htmlFor="days-radio-button-1" style={{marginRight: '1em'}}>2月</label>
            <input id="days-radio-button-1" type="radio"
              name="days-radio-button" onClick={() => this.fetchDataFromServer(121)} />
            <label htmlFor="days-radio-button-1" style={{marginRight: '1em'}}>4月</label>
            <input id="days-radio-button-2" type="radio"
              name="days-radio-button" onClick={() => this.fetchDataFromServer(365)} />
            <label htmlFor="days-radio-button-2" style={{marginRight: '1em'}}>1年</label>
            <input id="days-radio-button-3" type="radio"
              name="days-radio-button" onClick={() => this.fetchDataFromServer(730)} />
            <label htmlFor="days-radio-button-3" style={{marginRight: '1em'}}>2年</label>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Row style={{width: '100%'}}>
            <Col xs={8} className="my-auto">
              {this.state.reminderData.message}
            </Col>
            <Col xs={4} className="my-auto">
              <Button className="float-end my-auto" onClick={this.handleClickMessageBoxOK}>确认</Button>
            </Col>
          </Row>
        </Modal.Footer>
      </Modal>
    );
  }
}

export {Reminder};
