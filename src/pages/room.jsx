import { useParams } from 'react-router-dom';
import { RoomLobby } from '../components/RoomLobby';

export default function RoomPage() {
  const { roomCode } = useParams();
  
  return <RoomLobby roomCode={roomCode} />;
}
