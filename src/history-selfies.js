import axios from 'axios';
import moment from 'moment';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {TopNavBar} from './navbar';
import PropTypes from 'prop-types';

class SelfieItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      date: props.date
    };
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }

  fetchDataFromServer() {
    axios.get(`./get-selfie/?date=${this.state.date}`)
        .then((response) => {
          this.setState({
            data: null
          });
          this.setState({
            data: response.data
          });
        })
        .catch((error) => {});
  }

  render() {
    if (this.state.data === null) {
      return null;
    }

    return (
      <div className="gallery">
        <img src={`./get-selfie/?date=${this.state.date}`} alt={`${this.state.date}的自拍`} width="47vw" />
        <div className="desc">{this.state.date}</div>
      </div>
    );
  }
}

SelfieItem.propTypes = {
  date: PropTypes.instanceOf(Date)
};


class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const today = moment();
    const daysCount = 365 * 3;
    const images = new Array(daysCount);
    let i = 0;
    for (i = 0; i < daysCount; ++i) {
      images[i] = <SelfieItem date={today.format('YYYY-MM-DD')} />;
      today.subtract(1, 'days');
    }

    return (
      <div>
        <TopNavBar />
        <div
          style={{maxWidth: '50em', padding: '0.75rem', display: 'block', marginLeft: 'auto',
            marginRight: 'auto', marginTop: '3em', marginBottom: '3em'}}>
          {images}
        </div>
      </div>
    );
  }
}

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(<App />);
