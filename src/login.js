import axios from 'axios';
import React from 'react';
import {createRoot} from 'react-dom/client';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      errMessage: null
    };
    this.onSubmitButtonClicked = this.onSubmitButtonClicked.bind(this);
    this.onUsernameValueChanged = this.onUsernameValueChanged.bind(this);
    this.onPasswordValueChanged = this.onPasswordValueChanged.bind(this);
  }

  onUsernameValueChanged(event) {
    this.setState({
      username: event.target.value
    });
  }

  onPasswordValueChanged(event) {
    this.setState({
      password: event.target.value
    });
  }

  onSubmitButtonClicked() {
    const payload = new FormData();
    payload.append('username', this.state.username);
    payload.append('password', this.state.password);
    axios.post('../login/', payload)
        .then((response) => {
          if (response.data['authenticated'] === true) {
            this.setState({
              errMessage: null
            });
            window.location.replace('../');
          } else {
            this.setState({
              errMessage: '用户名或密码错误'
            });
          }
        })
        .catch((error) => {
          alert(`登录错误！原因：\n${(error.response !== undefined) ? JSON.stringify(error.response): error}`);
        });
  }

  render() {
    return (
      <Card style={{maxWidth: '30em', justifyContent: 'center'}}>
        <Card.Header className="text-white bg-primary">登录</Card.Header>
        <Card.Body>
          <Form>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <Form.Label>用户名</Form.Label>
              <Form.Control type="email" placeholder="请输入用户名"
                value={this.state.username} onChange={this.onUsernameValueChanged} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formBasicPassword">
              <Form.Label>密码</Form.Label>
              <Form.Control type="password" placeholder="请输入密码" value={this.state.password}
                onChange={this.onPasswordValueChanged} />
            </Form.Group>
            <Row>
              <Col xs={8} className="my-auto">
                {
                  this.state.errMessage === null ?
                  <></> :
                  <span className="text-danger"><strong>{this.state.errMessage}</strong></span>
                }
              </Col>
              <Col xs={4} className="my-auto">
                <Button className="float-end" variant="primary" onClick={this.onSubmitButtonClicked}>
                  登录
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
    );
  }
}

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(<App />);
