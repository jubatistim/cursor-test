import { useParams } from 'react-router-dom';
import { GameScreen } from '../components/GameScreen';

export default function GamePage() {
  const { roomCode } = useParams();
  
  return <GameScreen roomCode={roomCode} />;
}
