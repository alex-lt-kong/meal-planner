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
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      currNoteIndex: null,
      diffModeEnabled: false
    };
    this.onIndexChanged = this.onIndexChanged.bind(this);
    this.handleNotesChange = this.handleNotesChange.bind(this);
    this.handleClickUpdate = this.handleClickUpdate.bind(this);
    this.onNotesModeChangeClicked = this.onNotesModeChangeClicked.bind(this);
  }

  onNotesModeChangeClicked(event) {
    this.setState({
      diffModeEnabled: event === 2
    });
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
          // What if there arent any notes at the moment? The server will return an empty entry so that
          // we dont need to handle that here.
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
    let prettyDiffHtml = '';
    if (this.state.diffModeEnabled) {
      const dmp = new DiffMatchPatch();
      let diff;
      if (this.state.currNoteIndex >= 1 && this.state.data.length > 1) {
        diff = dmp.diff_main(
            this.state.data[this.state.currNoteIndex - 1].content, this.state.data[this.state.currNoteIndex].content
        );
      } else {
        diff = dmp.diff_main('', this.state.data[this.state.currNoteIndex].content);
      }
      prettyDiffHtml = dmp.diff_prettyHtml(diff).replaceAll('&para;', '');
    }

    return (
      <>
        <TopNavBar />
        <div style={{
          maxWidth: '50em', padding: '0.75rem', display: 'block',
          marginLeft: 'auto', marginRight: 'auto', marginBottom: '3em'
        }}>
          <div>
            {
              this.state.diffModeEnabled ?
              <span className="text-black"
                dangerouslySetInnerHTML={{__html: prettyDiffHtml}} /> :
              <TextareaAutosize value={this.state.data[this.state.currNoteIndex].content}
                onChange={this.handleNotesChange} style={{width: '100%', outline: '0', borderWidth: '0 0 1px'}}/>
            }
            <div>
              <Row>
                <Col xs={5} className="my-auto">
                  (更新于：{this.state.data[this.state.currNoteIndex].metadata.date})
                </Col>
                <Col xs={7} className="my-auto">
                  <Button className="float-end" variant="primary" onClick={this.handleClickUpdate}
                    disabled={this.state.currNoteIndex !== this.state.data.length - 1}>
                      提交
                  </Button>
                  <ToggleButtonGroup type="radio" name="options" className="float-end" defaultValue={1}
                    style={{marginRight: '1em'}} onChange={this.onNotesModeChangeClicked}>
                    <ToggleButton id="tbg-radio-1" value={1}>
                      原文
                    </ToggleButton>
                    <ToggleButton id="tbg-radio-2" value={2}>
                      对照
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Col>
              </Row>
            </div>
          </div>
        </div>
        <Navbar bg="primary" expand="lg" variant="dark" fixed="bottom">
          <Container>
            <Nav className="me-auto">
              <Nav.Link onClick={() => this.onIndexChanged(-1)}>&nbsp;&nbsp;❰&nbsp;&nbsp;</Nav.Link>
            </Nav>
            <Nav className="mx-auto text-light">
              <b>第{this.state.currNoteIndex + 1}/{this.state.data.length}版笔记</b>
            </Nav>
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
