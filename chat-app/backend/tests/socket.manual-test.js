/**
 * Manual integration test for the Socket.io layer, run against the live
 * backend process (DB intentionally down for this run — see notes).
 * Not part of the shipped app; used only to verify behavior during build.
 */
const { io } = require('socket.io-client');

const URL = 'http://127.0.0.1:5000';
let passed = 0;
let failed = 0;

function check(label, cond) {
  if (cond) {
    console.log(`PASS: ${label}`);
    passed += 1;
  } else {
    console.log(`FAIL: ${label}`);
    failed += 1;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const alice = io(URL, { forceNew: true });
  const bob = io(URL, { forceNew: true });

  let aliceOnline = null;
  let bobOnline = null;
  let bobSawTyping = null;
  let bobSawStopTyping = null;
  let aliceSawDisconnectEvent = null;

  alice.on('online_users', (data) => {
    aliceOnline = data;
  });
  bob.on('online_users', (data) => {
    bobOnline = data;
  });
  bob.on('typing', (data) => {
    if (data.isTyping) bobSawTyping = data;
    else bobSawStopTyping = data;
  });
  alice.on('user_disconnected', (data) => {
    aliceSawDisconnectEvent = data;
  });

  await new Promise((resolve) => alice.on('connect', resolve));
  check('Alice connects', alice.connected === true);

  await new Promise((resolve) => bob.on('connect', resolve));
  check('Bob connects', bob.connected === true);

  alice.emit('join_chat', { username: 'Alice' });
  await wait(300);
  check('online_users reflects Alice joining (count >= 1)', aliceOnline && aliceOnline.count >= 1);
  check('online_users includes Alice', aliceOnline && aliceOnline.usernames.includes('Alice'));

  bob.emit('join_chat', { username: 'Bob' });
  await wait(300);
  check('online_users reflects both users (count === 2)', bobOnline && bobOnline.count === 2);
  check(
    'online_users includes both usernames',
    bobOnline && bobOnline.usernames.includes('Alice') && bobOnline.usernames.includes('Bob')
  );

  // Typing indicator: Alice types, Bob should see it; Alice should not see her own typing.
  let aliceSawOwnTyping = false;
  alice.on('typing', () => {
    aliceSawOwnTyping = true;
  });
  alice.emit('user_typing');
  await wait(300);
  check('Bob receives typing event from Alice', bobSawTyping && bobSawTyping.username === 'Alice');
  check('Alice does NOT receive her own typing event (server uses broadcast)', aliceSawOwnTyping === false);

  alice.emit('user_stop_typing');
  await wait(300);
  check(
    'Bob receives stop-typing event from Alice',
    bobSawStopTyping && bobSawStopTyping.username === 'Alice' && bobSawStopTyping.isTyping === false
  );

  // send_message while DB is down should fail gracefully via ack + error event, not crash the server.
  let sendAck = null;
  let aliceErrorEvent = null;
  alice.on('error', (e) => {
    aliceErrorEvent = e;
  });
  alice.emit('send_message', { message: 'Hello Bob' }, (ack) => {
    sendAck = ack;
  });
  await wait(500);
  check('send_message with DB down returns ack.success === false', sendAck && sendAck.success === false);
  check('send_message with DB down emits an error event to sender', !!aliceErrorEvent);

  // Disconnect handling
  bob.disconnect();
  await wait(400);
  check('Alice is notified Bob disconnected', aliceSawDisconnectEvent && aliceSawDisconnectEvent.username === 'Bob');
  check('online_users count drops back to 1 after Bob leaves', aliceOnline && aliceOnline.count === 1);

  alice.disconnect();
  await wait(200);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
