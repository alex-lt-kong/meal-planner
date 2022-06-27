
import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

class TopNavBar extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Navbar bg="primary" expand="md" variant="dark">
        <Container>
          <Navbar.Brand href="#home"><b>每日食谱</b></Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav>
              <Nav.Link href="./?page=index" target="_blank">食谱</Nav.Link>
            </Nav>
            <NavDropdown title={<span className="text-light my-auto">翻看&nbsp;▾</span>}>
              <NavDropdown.Item href="./?page=history-selfies" target="_blank">自拍</NavDropdown.Item>
              <NavDropdown.Item href="./?page=history-attachments" target="_blank">附件</NavDropdown.Item>
            </NavDropdown>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  }
}

export {TopNavBar};
