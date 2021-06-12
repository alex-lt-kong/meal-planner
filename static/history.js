class History extends React.Component {

    constructor(props) {
      super(props);
      this.handleClickPlans = this.handleClickPlans.bind(this);
      this.handleClickSelfies = this.handleClickSelfies.bind(this);
    }
  
    handleClickPlans(event) {
      window.open('./history-plans/');
    }

    handleClickSelfies(event) {
      window.open('./history-selfies/');
    }

    render() {
      return (
        <div class="w3-cell-row" style={{ "margin-top": "0.35em" }}>
        <div class="w3-container w3-cell" style={{ padding: "0px", "padding-right": "0.175em" }}>
          <button class="w3-button w3-block w3-left-align w3-green" style={{  }} onClick={this.handleClickPlans}>
            历史食谱...
          </button> 
        </div>
        <div class="w3-container w3-cell" style={{ padding: "0px", "padding-left": "0.175em" }}>
          <button class="w3-button w3-block w3-left-align w3-green" style={{  }} onClick={this.handleClickSelfies}>
            历史自拍...
          </button>
        </div>
      </div>
      );
    }
  }