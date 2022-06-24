const axios = require('axios').default;

class History extends React.Component {

    constructor(props) {
      super(props);
      this.state = {
        appAddress: props.appAddress,
        username: null
      };
      this.handleClickPlans = this.handleClickPlans.bind(this);
      this.handleClickSelfies = this.handleClickSelfies.bind(this);
      this.fetchDataFromServer();
    }

    fetchDataFromServer() {
      axios.get(this.state.appAddress + 'get-username/')
        .then(response => {       
          this.setState({
            username: response.data.username
          });
        })
        .catch(error => {
          console.log('ERROR!');
        });
    }

    handleClickPlans(event) {
      window.open(this.state.appAddress + '?page=history-plans');
    }

    handleClickSelfies(event) {
      logUserActivity('[meal-planner/history-selfies]', this.state.username);
      window.open(this.state.appAddress + '?page=history-selfies');
    }

    render() {
      return (
        <div className="w3-cell-row" style={{ "marginTop": "0.35em" }}>
        <div className="w3-container w3-cell" style={{ padding: "0px", "paddingRight": "0.175em" }}>
          <button className="w3-button w3-block w3-left-align w3-green" onClick={this.handleClickPlans}>
            历史食谱...
          </button> 
        </div>
        <div className="w3-container w3-cell" style={{ padding: "0px", "paddingLeft": "0.175em" }}>
          <button className="w3-button w3-block w3-left-align w3-green" onClick={this.handleClickSelfies}>
            历史自拍...
          </button>
        </div>
      </div>
      );
    }
  }

export { History };