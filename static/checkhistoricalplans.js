class CheckHistoricalPlans extends React.Component {

    constructor(props) {
      super(props);
      this.handleClick = this.handleClick.bind(this);
    }
  
    handleClick(event) {
      window.open('./history-plans/');
    }
    render() {
      return (
        <button onClick={this.handleClick} class="w3-button w3-block w3-left-align w3-green" style={{ "margin-top": "0.35em"}} >
          翻看历史食谱
        </button>
      );
    }
  }