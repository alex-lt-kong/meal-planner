import React from 'react';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      index: null
    };
    this.handlePreviousClick = this.handlePreviousClick.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);
  }

  componentDidMount() {
    this.fetchDataFromServer();    
  }

  handlePreviousClick(event) {
    this.setState(prevState => ({
      index: prevState.index >= 1 ? prevState.index - 1 : (prevState.data.length - 1)
    }));
    logUserActivity('[meal-planner/history-notes] ' + this.state.data[this.state.index].metadata.date,
                    this.state.data[this.state.index].metadata.username);
    textAreaAdjust();
  }
  
  handleNextClick(event) {
    this.setState(prevState => ({
      index: (prevState.index < (prevState.data.length - 1)) ? (prevState.index + 1) : 0
    }));
    logUserActivity('[meal-planner/history-notes] ' + this.state.data[this.state.index].metadata.date,
                    this.state.data[this.state.index].metadata.username);
    textAreaAdjust();
  }
  
  fetchDataFromServer() {
    console.log('fetchDataFromServer');
    axios.get('https://monitor.sz.lan/meal-planner/get-history-notes/')
      .then(response => {       
        this.setState({
          data: null,
          index: null
          // make it empty before fill it in again to force a re-rendering.
        });
        this.setState({
          data: response.data,
          index: response.data.length - 1
        });
        logUserActivity('[meal-planner/history-notes] ' + this.state.data[this.state.index].metadata.date,
                        this.state.data[this.state.index].metadata.username);
        textAreaAdjust();
      })
      .catch(error => {
        alert('历史笔记加载失败！请关闭窗口后重试！\n' + error);
      });
  }

  render() {

    if (this.state.data === null) { return null; }

    return (
    <div>
      <div className="fixed-header">
        <h5>笔记历史记录</h5>
      </div>
      <div className="w3-container w3-responsive" 
           style={{ "maxWidth": "50em", padding: "0.75rem", display: "block", "marginLeft": "auto",
                    "marginRight": "auto", "marginTop": "3em", "marginBottom": "3em"}}>
        <textarea className="w3-input" style={{ width: "100%", border: "none"}}
                  readOnly={true} value={this.state.data[this.state.index].content} />
      </div>
      <div className="fixed-footer">
        <div className="w3-cell-row">
          <div className="w3-container w3-cell w3-cell-top">
            <p><a href="#" onClick={this.handlePreviousClick}>向前</a></p>
          </div>        
          <div className="w3-container w3-cell w3-cell-middle w3-center">
            <b>{this.state.data[this.state.index].metadata.date}</b>
          </div>          
          <div className="w3-container w3-cell w3-cell-bottom">
            <p><a href="#" onClick={this.handleNextClick}>向后</a></p>
          </div>
        </div>
      </div>
    </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);