import axios from 'axios';
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
    console.log('fetchDataFromServer');
    axios.get('./get-selfie/?date=' + this.state.date)
        .then((response) => {
          this.setState({
            data: null
          });
          this.setState({
            data: response.data
          });
        })
        .catch((error) => {
          console.log('ERROR!');
        });
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
    console.log(window.location.href);
  }

  render() {
    // A hacky way of getting UTC+8...
    const today = new Date(new Date().getTime() + (8*60*60*1000));
    const daysCount = 730;
    const images = new Array(daysCount);
    let i = 0;
    for (i = 0; i < daysCount; i++) {
      images[i] = <SelfieItem date={today.toISOString().slice(0, 10)} />;
      today.setDate(today.getDate() - 1);
    }

    return (
      <div>
        <TopNavBar />
        <div className="w3-container w3-responsive"
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
