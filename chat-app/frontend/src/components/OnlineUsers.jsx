export default function OnlineUsers({ count, usernames }) {
  return (
    <div className="online-users" title={usernames.join(', ')}>
      <span className="online-dot" aria-hidden="true" />
      Online: {count}
    </div>
  );
}
