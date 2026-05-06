import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <PageWrapper>
      <StyledLoader />
    </PageWrapper>
  );
};

const PageWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: #ffffff;
`;

const StyledLoader = styled.div`
  transform: rotateZ(45deg);
  perspective: 1000px;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  color: #ff6b2b;
  position: relative;

  &::before,
  &::after {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: inherit;
    height: inherit;
    border-radius: 50%;
    transform: rotateX(70deg);
    animation: spin 1s linear infinite;
  }

  &::after {
    color: #ff9a3c;
    transform: rotateY(70deg);
    animation-delay: 0.4s;
  }

  @keyframes spin {
    0%, 100% { box-shadow:  0.2em 0px    0 0px currentColor; }
    12%       { box-shadow:  0.2em 0.2em  0 0   currentColor; }
    25%       { box-shadow:  0    0.2em  0 0px currentColor; }
    37%       { box-shadow: -0.2em 0.2em  0 0   currentColor; }
    50%       { box-shadow: -0.2em 0px    0 0   currentColor; }
    62%       { box-shadow: -0.2em -0.2em 0 0   currentColor; }
    75%       { box-shadow:  0px  -0.2em 0 0   currentColor; }
    87%       { box-shadow:  0.2em -0.2em 0 0   currentColor; }
  }
`;

export default Loader;
