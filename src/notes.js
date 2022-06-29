import axios from 'axios';
import React from 'react';
import {createRoot} from 'react-dom/client';
import Button from 'react-bootstrap/Button';
import {TopNavBar} from './navbar';
import TextareaAutosize from 'react-textarea-autosize';
import DiffMatchPatch from 'diff-match-patch';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      currNoteIndex: null
    };
    this.onIndexChanged = this.onIndexChanged.bind(this);
    this.handleNotesChange = this.handleNotesChange.bind(this);
    this.handleClickUpdate = this.handleClickUpdate.bind(this);
  }

  componentDidMount() {
    this.fetchDataFromServer();
  }

  onIndexChanged(delta) {
    this.setState((prevState) => {
      let newNoteIndex = prevState.currNoteIndex + delta;
      if (newNoteIndex < 0) {
        newNoteIndex = prevState.data.length - 1;
      } else if (newNoteIndex >= prevState.data.length) {
        newNoteIndex = 0;
      }
      return ({
        currNoteIndex: newNoteIndex
      });
    });
  }

  fetchDataFromServer() {
    axios.get('./get-history-notes/')
        .then((response) => {
          this.setState({
            data: response.data,
            currNoteIndex: response.data.length - 1
          });
        })
        .catch((error) => {
          alert(`笔记加载失败！原因：\n` + (error.response !== undefined) ? JSON.stringify(error.response): error);
        });
  }

  handleNotesChange(event) {
    if (this.state.currNoteIndex !== this.state.data.length - 1) {
      return;
    }
    const tempData = this.state.data;
    tempData[this.state.currNoteIndex].content = event.target.value;
    this.setState({
      data: tempData
    });
  }

  handleClickUpdate(event) {
    if (this.state.data.length === 0) {
      alert('根本没有任何笔记数据');
      return;
    }
    const payload = new FormData();
    payload.append('data', JSON.stringify(this.state.data[this.state.data.length - 1]));
    axios({
      method: 'post',
      url: './update-notes/',
      data: payload
    })
        .then(() => {
          alert('健康笔记更新成功！');
          this.fetchDataFromServer();
        })
        .catch((error) => {
          alert(`健康笔记更新错误！原因：\n` + (error.response !== undefined) ? JSON.stringify(error.response): error);
        });
  }

  render() {
    if (this.state.data === null) {
      return null;
    }
    let prettyDiff = null;
    if (this.state.currNoteIndex >= 1 && this.state.data.length > 1) {
      const dmp = new DiffMatchPatch();
      const diff = dmp.diff_main(
          this.state.data[this.state.currNoteIndex - 1].content, this.state.data[this.state.currNoteIndex].content
      );
      prettyDiff = (
        <span>
          <b>对照：</b>
          <span dangerouslySetInnerHTML={{__html: dmp.diff_prettyHtml(diff)}} />
        </span>);
    }

    return (
      <>
        <TopNavBar />
        <div style={{
          maxWidth: '50em', padding: '0.75rem', display: 'block',
          marginLeft: 'auto', marginRight: 'auto', marginBottom: '3em'
        }}>
          <div>
            <TextareaAutosize value={this.state.data[this.state.currNoteIndex].content}
              onChange={this.handleNotesChange} style={{width: '100%', outline: '0', borderWidth: '0 0 1px'}}/>
            <div>
              (更新日期：{this.state.data[this.state.currNoteIndex].metadata.date})
              {
                this.state.currNoteIndex === this.state.data.length - 1 ?
                <Button className="pull-right" style={{marginLeft: '1em'}} variant="primary"
                  onClick={this.handleClickUpdate}>提交</Button> :
                <></>
              }
            </div>
            {prettyDiff}
          </div>
        </div>
        <Navbar bg="primary" expand="lg" variant="dark" fixed="bottom">
          <Container>
            <Nav className="me-auto">
              <Nav.Link onClick={() => this.onIndexChanged(-1)}>&nbsp;&nbsp;❰&nbsp;&nbsp;</Nav.Link>
            </Nav>
            <Nav className="mx-auto text-light"><b>第{this.state.currNoteIndex + 1}/{this.state.data.length}版笔记</b></Nav>
            <Nav className="ms-auto">
              <Nav.Link onClick={() => this.onIndexChanged(1)}>&nbsp;&nbsp;❱&nbsp;&nbsp;</Nav.Link>
            </Nav>
          </Container>
        </Navbar>
      </>
    );
  }
}


const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(<App />);
