import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

describe('jest + testing-library smoke test', () => {
  it('renders a basic component', () => {
    render(
      <View>
        <Text>hello quic</Text>
      </View>
    );

    expect(screen.getByText('hello quic')).toBeTruthy();
  });
});
