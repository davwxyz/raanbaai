import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Bell, Bookmark, Camera, Check, CheckCheck, Compass, Heart, Home, Image as ImageIcon,
  LogOut, MessageCircle, MoreHorizontal, Plus, Search, Send, Shield, ShieldAlert,
  Sparkles, UserPlus, Users, X, Zap, Moon, Sun, BarChart3, Hash
} from 'lucide-react';
import { supabase, supabaseReady } from './supabase';

const initials = (name = 'User') => name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'U';
const since = value => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};
const errText = e => e?.message || 'Something went wrong. Please try again.';
const publicUrl = path => {
  const { data } = supabase.storage.from('raanbaai-media').getPublicUrl(path);
  return data.publicUrl;
};

function Avatar({ profile, size = 'md' }) {
  return profile?.avatar_url
    ? <img className={`avatar avatar-${size}`} src={profile.avatar_url} alt="" />
    : <div className={`avatar avatar-${size} avatar-fallback`}>{initials(profile?.display_name || profile?.username || 'User')}</div>;
}

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name.trim(), username: username.trim().toLowerCase() } }
        });
        if (error) throw error;
        setNotice('Account created. If email confirmation is enabled, check your inbox before signing in.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) { setNotice(errText(e)); }
    finally { setBusy(false); }
  };
  return <main className="auth-page">
    <section className="auth-art">
      <div className="brand brand-light"><span className="brand-mark"><Zap size={20} fill="currentColor" /></span> Raanbaai</div>
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={14}/> YOUR PEOPLE, YOUR WORLD</span>
        <h1>Good things<br/>happen <em>together.</em></h1>
        <p>A place to share moments, meet people, and keep your circle close.</p>
        <div className="avatar-stack"><span>DA</span><span>MK</span><span>JL</span><span>+</span><small>Make room for more connections.</small></div>
      </div>
      <div className="art-orb orb-one"/><div className="art-orb orb-two"/>
      <div className="auth-foot">A little closer, every day.</div>
    </section>
    <section className="auth-form-wrap">
      <div className="auth-mobile-brand brand"><span className="brand-mark"><Zap size={20} fill="currentColor" /></span> Raanbaai</div>
      <div className="auth-form">
        <span className="eyebrow">WELCOME TO RAANBAAI</span>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="muted">{mode === 'login' ? 'Pick up where your people left off.' : 'Your next connection starts here.'}</p>
        <form onSubmit={submit} className="stack-form">
          {mode === 'signup' && <>
            <label>Display name<input required maxLength="60" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. David Agootson"/></label>
            <label>Username<input required minLength="3" maxLength="24" pattern="[A-Za-z0-9_]+" value={username} onChange={e => setUsername(e.target.value)} placeholder="yourname" autoComplete="username"/></label>
          </>}
          <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
          <label>Password<input required minLength="6" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
          {notice && <div className="notice">{notice}</div>}
          <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button>
        </form>
        <p className="auth-switch">{mode === 'login' ? "New to Raanbaai?" : 'Already have an account?'} <button className="text-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setNotice(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
        <div className="secure-note"><Shield size={14}/> Your account is protected by Supabase authentication.</div>
      </div>
    </section>
  </main>;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('Home');
  const [feed, setFeed] = useState([]);
  const [people, setPeople] = useState([]);
  const [stories, setStories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [savedPostIds, setSavedPostIds] = useState([]);
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem('raanbaai-theme') === 'dark'; } catch { return false; } });
  const [pollMode, setPollMode] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [activeHashtag, setActiveHashtag] = useState('');
  const [searchText, setSearchText] = useState('');
  const [postText, setPostText] = useState('');
  const [postFile, setPostFile] = useState(null);
  const [storyFile, setStoryFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [requests, setRequests] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState([]);
  const [editProfile, setEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);

  const notify = useCallback(message => { setToast(message); window.setTimeout(() => setToast(''), 3000); }, []);
  const run = useCallback(async promise => {
    const { data, error: e } = await promise;
    if (e) throw e;
    return data;
  }, []);

  useEffect(() => {
    try { localStorage.setItem('raanbaai-theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!session?.user) return;
    try {
      let row = await run(supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
      if (!row) {
        const meta = session.user.user_metadata || {};
        const base = (meta.username || session.user.email?.split('@')[0] || 'member').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 18) || 'member';
        row = await run(supabase.from('profiles').insert({ id: session.user.id, username: `${base}_${session.user.id.slice(0, 5)}`, display_name: meta.display_name || 'New member' }).select().single());
      }
      setProfile(row); setEditName(row.display_name || ''); setEditBio(row.bio || '');
      const admin = await run(supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle());
      setIsAdmin(Boolean(admin));
    } catch (e) { setError(errText(e)); }
  }, [session, run]);

  const loadFeed = useCallback(async () => {
    if (!session?.user) return;
    try {
      const posts = await run(supabase.from('posts').select('*, profiles!posts_user_id_fkey(id, username, display_name, avatar_url)').order('created_at', { ascending: false }).limit(50));
      const ids = posts.map(p => p.id);
      let likes = [], comments = [], reactions = [], polls = [], options = [], votes = [], bookmarks = [];
      if (ids.length) {
        likes = await run(supabase.from('likes').select('post_id,user_id').in('post_id', ids));
        comments = await run(supabase.from('comments').select('id,post_id,body,user_id,created_at,profiles(username,display_name,avatar_url)').in('post_id', ids).order('created_at', { ascending: true }));
        reactions = await run(supabase.from('post_reactions').select('post_id,user_id,reaction').in('post_id', ids));
        polls = await run(supabase.from('polls').select('id,post_id,question').in('post_id', ids));
        const pollIds = polls.map(p => p.id);
        if (pollIds.length) {
          options = await run(supabase.from('poll_options').select('id,poll_id,label').in('poll_id', pollIds).order('created_at', { ascending: true }));
          votes = await run(supabase.from('poll_votes').select('poll_id,option_id,user_id').in('poll_id', pollIds));
        }
        bookmarks = await run(supabase.from('bookmarks').select('post_id').eq('user_id', session.user.id).in('post_id', ids));
      }
      setSavedPostIds(bookmarks.map(b => b.post_id));
      const blocked = await run(supabase.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${session.user.id},blocked_id.eq.${session.user.id}`));
      const blockedIds = new Set(blocked.map(b => b.blocker_id === session.user.id ? b.blocked_id : b.blocker_id));
      setFeed(posts.filter(p => !blockedIds.has(p.user_id)).map(p => {
        const poll = polls.find(x => x.post_id === p.id);
        return { ...p, likes: likes.filter(l => l.post_id === p.id), comments: comments.filter(c => c.post_id === p.id),
          reactions: reactions.filter(r => r.post_id === p.id), poll: poll ? { ...poll, options: options.filter(o => o.poll_id === poll.id).map(o => ({ ...o, votes: votes.filter(v => v.option_id === o.id) })), votes: votes.filter(v => v.poll_id === poll.id) } : null };
      }));
    } catch (e) { setError(errText(e)); }
  }, [session, run]);

  const loadPeople = useCallback(async () => {
    if (!session?.user) return;
    try {
      const rows = await run(supabase.from('profiles').select('*').neq('id', session.user.id).order('created_at', { ascending: false }).limit(100));
      const follows = await run(supabase.from('follows').select('following_id').eq('follower_id', session.user.id));
      const sent = await run(supabase.from('friend_requests').select('receiver_id,status').eq('sender_id', session.user.id).eq('status', 'pending'));
      const blocked = await run(supabase.from('blocks').select('blocker_id,blocked_id').eq('blocker_id', session.user.id));
      const following = new Set(follows.map(x => x.following_id));
      const pending = new Set(sent.map(x => x.receiver_id));
      const blockedSet = new Set(blocked.map(x => x.blocked_id));
      setPeople(rows.filter(p => !blockedSet.has(p.id)).map(p => ({ ...p, isFollowing: following.has(p.id), requestPending: pending.has(p.id) })));
    } catch (e) { setError(errText(e)); }
  }, [session, run]);

  const loadStories = useCallback(async () => {
    if (!session?.user) return;
    try {
      const rows = await run(supabase.from('stories').select('*, profiles!stories_user_id_fkey(id,username,display_name,avatar_url)').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(60));
      setStories(rows);
    } catch (e) { setError(errText(e)); }
  }, [session, run]);

  const loadNotifications = useCallback(async () => {
    if (!session?.user) return;
    try {
      const rows = await run(supabase.from('notifications').select('*, actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url)').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(30));
      setNotifications(rows); setUnread(rows.filter(n => !n.read_at).length);
    } catch (e) { setError(errText(e)); }
  }, [session, run]);

  const loadRequests = useCallback(async () => {
    if (!session?.user) return;
    try {
      const rows = await run(supabase.from('friend_requests').select('*, sender:profiles!friend_requests_sender_id_fkey(id,username,display_name,avatar_url)').eq('receiver_id', session.user.id).eq('status', 'pending').order('created_at', { ascending: false }));
      setRequests(rows);
    } catch (e) { setError(errText(e)); }
  }, [session, run]);

  const loadChats = useCallback(async () => {
    if (!session?.user) return;
    try {
      const memberships = await run(supabase.from('conversation_members').select('conversation_id').eq('user_id', session.user.id));
      if (!memberships.length) { setChats([]); return; }
      const ids = memberships.map(m => m.conversation_id);
      const members = await run(supabase.from('conversation_members').select('conversation_id,user_id,profiles(id,username,display_name,avatar_url)').in('conversation_id', ids).neq('user_id', session.user.id));
      const convos = await run(supabase.from('conversations').select('id,created_at').in('id', ids).order('created_at', { ascending: false }));
      setChats(convos.map(c => ({ ...c, person: members.find(m => m.conversation_id === c.id)?.profiles })).filter(c => c.person));
    } catch (e) { setError(errText(e)); }
  }, [session, run]);

  useEffect(() => {
    if (session?.user) {
      loadProfile(); loadFeed(); loadPeople(); loadStories(); loadNotifications(); loadRequests(); loadChats();
    } else { setProfile(null); setFeed([]); setPeople([]); setStories([]); setNotifications([]); setChats([]); setIsAdmin(false); }
  }, [session, loadProfile, loadFeed, loadPeople, loadStories, loadNotifications, loadRequests, loadChats]);

  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase.channel(`raanbaai-user-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => loadNotifications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (activeChat && payload.new.conversation_id === activeChat.id) loadMessages(activeChat.id);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, activeChat, loadNotifications]);

  const upload = async (file, folder) => {
    if (!file) return null;
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Images must be 8 MB or smaller.');
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${session.user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error: e } = await supabase.storage.from('raanbaai-media').upload(path, file, { upsert: false, contentType: file.type });
    if (e) throw e;
    return publicUrl(path);
  };

  const createPost = async e => {
    e.preventDefault();
    const validOptions = pollOptions.map(x => x.trim()).filter(Boolean);
    if (!postText.trim() && !postFile && !(pollMode && pollQuestion.trim())) return;
    if (pollMode && (!pollQuestion.trim() || validOptions.length < 2)) return setError('A poll needs a question and at least two options.');
    setBusy(true); setError('');
    try {
      const image_url = await upload(postFile, 'posts');
      const body = postText.trim() || (pollMode ? pollQuestion.trim() : '');
      const created = await run(supabase.from('posts').insert({ user_id: session.user.id, body, image_url }).select('id').single());
      if (pollMode) {
        const poll = await run(supabase.from('polls').insert({ post_id: created.id, question: pollQuestion.trim() }).select('id').single());
        await run(supabase.from('poll_options').insert(validOptions.map(label => ({ poll_id: poll.id, label }))));
      }
      setPostText(''); setPostFile(null); setPollMode(false); setPollQuestion(''); setPollOptions(['', '']); e.target.reset(); await loadFeed(); notify(pollMode ? 'Your poll is live.' : 'Your post is live.');
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };

  const createStory = async () => {
    if (!storyFile) return notify('Choose an image for your story first.');
    setBusy(true);
    try {
      const image_url = await upload(storyFile, 'stories');
      await run(supabase.from('stories').insert({ user_id: session.user.id, image_url }));
      setStoryFile(null); await loadStories(); notify('Story added for 24 hours.');
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };

  const toggleLike = async post => {
    try {
      const liked = post.likes.some(l => l.user_id === session.user.id);
      if (liked) await run(supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', session.user.id));
      else await run(supabase.from('likes').insert({ post_id: post.id, user_id: session.user.id }));
      await loadFeed();
    } catch (e) { setError(errText(e)); }
  };

  const toggleBookmark = async post => {
    try {
      const saved = savedPostIds.includes(post.id);
      if (saved) await run(supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', session.user.id));
      else await run(supabase.from('bookmarks').insert({ post_id: post.id, user_id: session.user.id }));
      setSavedPostIds(old => saved ? old.filter(id => id !== post.id) : [...old, post.id]);
      notify(saved ? 'Bookmark removed.' : 'Post saved to bookmarks.');
    } catch (e) { setError(errText(e)); }
  };

  const toggleReaction = async (post, reaction) => {
    try {
      const existing = post.reactions?.find(r => r.user_id === session.user.id);
      if (existing?.reaction === reaction) await run(supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', session.user.id));
      else await run(supabase.from('post_reactions').upsert({ post_id: post.id, user_id: session.user.id, reaction }, { onConflict: 'post_id,user_id' }));
      await loadFeed();
    } catch (e) { setError(errText(e)); }
  };

  const votePoll = async (poll, optionId) => {
    try {
      await run(supabase.from('poll_votes').upsert({ poll_id: poll.id, option_id: optionId, user_id: session.user.id }, { onConflict: 'poll_id,user_id' }));
      await loadFeed(); notify('Your vote has been recorded.');
    } catch (e) { setError(errText(e)); }
  };

  const follow = async person => {
    try {
      if (person.isFollowing) await run(supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', person.id));
      else await run(supabase.from('follows').insert({ follower_id: session.user.id, following_id: person.id }));
      await Promise.all([loadPeople(), loadFeed()]); notify(person.isFollowing ? 'Unfollowed.' : `Following ${person.display_name}.`);
    } catch (e) { setError(errText(e)); }
  };

  const requestFriend = async person => {
    try {
      await run(supabase.from('friend_requests').upsert({ sender_id: session.user.id, receiver_id: person.id, status: 'pending' }, { onConflict: 'sender_id,receiver_id' }));
      await loadPeople(); notify('Friend request sent.');
    } catch (e) { setError(errText(e)); }
  };

  const respondRequest = async (request, status) => {
    try {
      await run(supabase.from('friend_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', request.id));
      if (status === 'accepted') {
        await run(supabase.from('follows').upsert([
          { follower_id: session.user.id, following_id: request.sender_id },
          { follower_id: request.sender_id, following_id: session.user.id }
        ], { onConflict: 'follower_id,following_id', ignoreDuplicates: true }));
      }
      await Promise.all([loadRequests(), loadPeople()]); notify(status === 'accepted' ? 'Friend request accepted.' : 'Request declined.');
    } catch (e) { setError(errText(e)); }
  };

  const poke = async person => {
    try { await run(supabase.from('pokes').insert({ sender_id: session.user.id, receiver_id: person.id })); notify(`You poked ${person.display_name}.`); await loadNotifications(); }
    catch (e) { setError(errText(e)); }
  };

  const addComment = async (postId, body) => {
    if (!body.trim()) return;
    try { await run(supabase.from('comments').insert({ post_id: postId, user_id: session.user.id, body: body.trim() })); await loadFeed(); }
    catch (e) { setError(errText(e)); }
  };

  const markNotificationRead = async notificationId => {
    try {
      await run(supabase.from('notifications').update({ read_at: new Date().toISOString() })
        .eq('id', notificationId).eq('user_id', session.user.id).is('read_at', null));
      await loadNotifications();
    } catch (e) { setError(errText(e)); }
  };

  const markNotificationsRead = async () => {
    try {
      await run(supabase.from('notifications').update({ read_at: new Date().toISOString() })
        .eq('user_id', session.user.id).is('read_at', null));
      await loadNotifications();
      notify('All notifications marked as read.');
    } catch (e) { setError(errText(e)); }
  };

  const startChat = async person => {
    try {
      const existing = await run(supabase.from('conversation_members').select('conversation_id').eq('user_id', session.user.id));
      let found = null;
      if (existing.length) {
        const ids = existing.map(r => r.conversation_id);
        const other = await run(supabase.from('conversation_members').select('conversation_id').eq('user_id', person.id).in('conversation_id', ids));
        found = other[0]?.conversation_id || null;
      }
      let conversationId = found;
      if (!conversationId) {
        const conv = await run(supabase.from('conversations').insert({ created_by: session.user.id }).select().single());
        conversationId = conv.id;
        await run(supabase.from('conversation_members').insert([{ conversation_id: conversationId, user_id: session.user.id }, { conversation_id: conversationId, user_id: person.id }]));
      }
      const chat = { id: conversationId, person };
      setActiveChat(chat); await loadMessages(conversationId); setTab('Messages'); await loadChats();
    } catch (e) { setError(errText(e)); }
  };

  const loadMessages = async conversationId => {
    try {
      const rows = await run(supabase.from('messages').select('*, profiles(id,username,display_name,avatar_url)').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(100));
      setMessages(rows);
    } catch (e) { setError(errText(e)); }
  };

  const sendMessage = async e => {
    e.preventDefault(); if (!messageText.trim() || !activeChat) return;
    const body = messageText.trim(); setMessageText('');
    try {
      await run(supabase.from('messages').insert({ conversation_id: activeChat.id, sender_id: session.user.id, body }));
      await loadMessages(activeChat.id);
    } catch (e) { setError(errText(e)); setMessageText(body); }
  };

  const blockUser = async person => {
    if (!window.confirm(`Block ${person.display_name}? You will no longer see each other's interactions in Raanbaai.`)) return;
    try {
      await run(supabase.from('blocks').insert({ blocker_id: session.user.id, blocked_id: person.id }));
      await Promise.all([loadPeople(), loadFeed()]); notify('User blocked.');
    } catch (e) { setError(errText(e)); }
  };

  const report = async (targetType, targetId, targetUserId = null) => {
    const reason = window.prompt('Briefly explain the issue (spam, harassment, impersonation, or other):');
    if (!reason?.trim()) return;
    try { await run(supabase.from('reports').insert({ reporter_id: session.user.id, target_type: targetType, target_id: targetId, target_user_id: targetUserId, reason: reason.trim() })); notify('Report submitted for review.'); }
    catch (e) { setError(errText(e)); }
  };

  const saveProfile = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const avatar_url = avatarFile ? await upload(avatarFile, 'avatars') : profile.avatar_url;
      const updated = await run(supabase.from('profiles').update({ display_name: editName.trim(), bio: editBio.trim(), avatar_url }).eq('id', session.user.id).select().single());
      setProfile(updated); setEditProfile(false); setAvatarFile(null); notify('Profile updated.');
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };

  const loadReports = async () => {
    try { setReports(await run(supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(username,display_name), target_user:profiles!reports_target_user_id_fkey(username,display_name)').order('created_at', { ascending: false }).limit(100))); }
    catch (e) { setError(errText(e)); }
  };

  const resolveReport = async (id, status) => {
    try { await run(supabase.from('reports').update({ status, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', id)); await loadReports(); notify('Report updated.'); }
    catch (e) { setError(errText(e)); }
  };

  const deletePost = async id => {
    if (!window.confirm('Delete this post?')) return;
    try { await run(supabase.from('posts').delete().eq('id', id)); await loadFeed(); notify('Post deleted.'); }
    catch (e) { setError(errText(e)); }
  };

  const filteredPeople = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return people.filter(p => !q || `${p.display_name} ${p.username} ${p.bio || ''}`.toLowerCase().includes(q));
  }, [people, searchText]);

  if (!supabaseReady) return <div className="setup-screen"><div className="setup-card"><div className="brand"><span className="brand-mark"><Zap size={20} fill="currentColor"/></span> Raanbaai</div><h1>One quick setup step.</h1><p>Add your Supabase project URL and publishable key to the <code>.env</code> file. Then restart the dev server.</p><pre>VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co{"\n"}VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY</pre><p className="muted">See README.md for the database setup and admin instructions.</p></div></div>;
  if (!session) return <AuthScreen/>;

  const navItems = [
    { name: 'Home', icon: Home }, { name: 'Explore', icon: Compass }, { name: 'Messages', icon: MessageCircle },
    { name: 'Notifications', icon: Bell, count: unread }, { name: 'Saved', icon: Bookmark }, { name: 'Friends', icon: Users }, { name: 'Profile', icon: Activity },
    ...(isAdmin ? [{ name: 'Admin', icon: ShieldAlert }] : [])
  ];

  return <div className={`app-shell ${darkMode ? 'theme-dark' : 'theme-light'}`} data-theme={darkMode ? 'dark' : 'light'}>
    <aside className="sidebar">
      <button className="brand brand-button" onClick={() => setTab('Home')}><span className="brand-mark"><Zap size={20} fill="currentColor"/></span> Raanbaai<span className="brand-dot">.</span></button>
      <div className="side-label">MENU</div>
      <nav className="main-nav">
        {navItems.map(item => <button key={item.name} className={`nav-item ${tab === item.name ? 'active' : ''}`} onClick={() => { setTab(item.name); if (item.name === 'Admin') loadReports(); }}>
          <item.icon size={19}/><span>{item.name}</span>{item.count > 0 && <b className="nav-count">{item.count}</b>}
        </button>)}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-tip"><Sparkles size={17}/><b>Make a connection</b><p>A small hello can start something good.</p><button onClick={() => setTab('Explore')}>Find people <span>→</span></button></div>
      <button className="profile-mini" onClick={() => setTab('Profile')}><Avatar profile={profile}/><span><b>{profile?.display_name}</b><small>@{profile?.username}</small></span><MoreHorizontal size={18}/></button>
      <button className="signout" onClick={() => supabase.auth.signOut()}><LogOut size={17}/> Sign out</button>
    </aside>

    <main className="main-area">
      <header className="topbar"><div><span className="eyebrow">YOUR COMMUNITY</span><h1>{tab === 'Home' ? 'Your feed' : tab}</h1></div><div className="topbar-actions"><button className="icon-btn" title={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDarkMode(v => !v)}>{darkMode ? <Sun size={19}/> : <Moon size={19}/>}</button><button className="icon-btn" title="Notifications" onClick={() => setTab('Notifications')}><Bell size={19}/>{unread > 0 && <i/>}</button><button className="top-profile" onClick={() => setTab('Profile')}><Avatar profile={profile} size="sm"/></button></div></header>
      {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}

      {tab === 'Home' && <div className="content-grid">
        <section className="feed-column">
          <div className="welcome-card"><div><span className="eyebrow">A FRESH START</span><h2>Hey, {profile?.display_name?.split(' ')[0] || 'there'} <span>✦</span></h2><p>Your people are just a post away.</p></div><div className="welcome-graphic"><span>✳</span><i/><b/></div></div>
          <div className="stories-panel">
            <div className="section-heading"><div><h3>Stories</h3><p>Little moments, here for 24 hours</p></div><span className="soft-tag">24H</span></div>
            <div className="stories-row">
              <label className="story story-add"><span className="story-avatar"><Avatar profile={profile}/><i><Plus size={15}/></i></span><b>Your story</b><input type="file" accept="image/*" onChange={e => setStoryFile(e.target.files?.[0] || null)}/></label>
              {stories.map(s => <button className="story" key={s.id} onClick={() => window.open(s.image_url, '_blank', 'noopener,noreferrer')}><span className="story-avatar story-ring"><Avatar profile={s.profiles}/></span><b>{s.profiles?.display_name?.split(' ')[0] || 'Member'}</b></button>)}
            </div>
            {storyFile && <div className="story-upload"><span>{storyFile.name}</span><button className="btn btn-primary btn-small" disabled={busy} onClick={createStory}>Share story</button><button className="text-btn" onClick={() => setStoryFile(null)}>Cancel</button></div>}
          </div>
          <form className="composer card" onSubmit={createPost}>
            <div className="composer-top"><Avatar profile={profile}/><textarea rows="2" maxLength="3000" value={postText} onChange={e => setPostText(e.target.value)} placeholder="What would you like to share?"/></div>
            {postFile && <div className="selected-file"><ImageIcon size={16}/>{postFile.name}<button type="button" onClick={() => setPostFile(null)}><X size={14}/></button></div>}
            {pollMode && <div className="poll-composer"><label>Poll question<input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} maxLength="240" placeholder="Ask your community a question"/></label>{pollOptions.map((option, i) => <input key={i} value={option} maxLength="120" onChange={e => setPollOptions(old => old.map((x, j) => j === i ? e.target.value : x))} placeholder={`Option ${i + 1}`}/>)}<div className="poll-composer-actions"><button type="button" className="text-btn" disabled={pollOptions.length >= 6} onClick={() => setPollOptions(old => [...old, ''])}>+ Add option</button><button type="button" className="text-btn" onClick={() => { setPollMode(false); setPollQuestion(''); setPollOptions(['', '']); }}>Cancel poll</button></div></div>}
            <div className="composer-bottom"><label className="attach-btn"><Camera size={17}/> Photo<input type="file" accept="image/*" onChange={e => setPostFile(e.target.files?.[0] || null)}/></label><button type="button" className={`attach-btn ${pollMode ? 'active' : ''}`} onClick={() => setPollMode(v => !v)}><BarChart3 size={17}/> Poll</button><span className="muted tiny">{postText.length}/3000</span><button className="btn btn-primary btn-small" disabled={busy || (!postText.trim() && !postFile && !(pollMode && pollQuestion.trim()))}><Send size={14}/> {busy ? 'Posting…' : 'Share post'}</button></div>
          </form>
          {activeHashtag && <div className="hashtag-active">Showing #{activeHashtag} <button onClick={() => setActiveHashtag('')}>Clear filter ×</button></div>}
          <div className="feed-list">
            {feed.length === 0 && <div className="empty-state card"><div className="empty-icon"><MessageCircle size={24}/></div><h3>Your feed starts here</h3><p>Share your first post or find people to follow.</p><button className="btn btn-primary" onClick={() => setTab('Explore')}>Explore people</button></div>}
            {feed.filter(post => !activeHashtag || new RegExp(`(^|\\s)#${activeHashtag}\\b`, 'i').test(post.body || '')).map(post => <PostCard key={post.id} post={post} userId={session.user.id} saved={savedPostIds.includes(post.id)} onBookmark={() => toggleBookmark(post)} onReaction={reaction => toggleReaction(post, reaction)} onVote={optionId => votePoll(post.poll, optionId)} onHashtag={tag => { setActiveHashtag(tag); setTab('Home'); }} onLike={() => toggleLike(post)} onComment={addComment} onReport={() => report('post', post.id, post.user_id)} onDelete={() => deletePost(post.id)} onProfile={() => { setSearchText(post.profiles?.username || ''); setTab('Explore'); }}/>) }
          </div>
        </section>
        <aside className="right-column">
          <div className="card side-card"><div className="section-heading"><div><h3>People to know</h3><p>Find your next connection</p></div><button className="link-btn" onClick={() => setTab('Explore')}>See all</button></div>
            {people.slice(0, 4).map(p => <PersonRow key={p.id} person={p} onFollow={() => follow(p)} onPoke={() => poke(p)} onMessage={() => startChat(p)} compact/>)}
            {people.length === 0 && <p className="muted tiny">New faces will show up here.</p>}
          </div>
          <div className="quote-card"><span>“</span><p>Every connection begins with a little curiosity.</p><small>YOUR RAANBAAI REMINDER</small></div>
          <div className="side-footer">About · Community · Privacy<br/><span>© 2026 Raanbaai</span></div>
        </aside>
      </div>}

      {tab === 'Explore' && <section className="page-content">
        <div className="search-box"><Search size={19}/><input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search names, usernames, or bios…"/>{searchText && <button onClick={() => setSearchText('')}><X size={16}/></button>}</div>
        <div className="section-heading page-heading"><div><h2>People you might like</h2><p>Public profiles across the Raanbaai community</p></div><span className="soft-tag">{filteredPeople.length} PEOPLE</span></div>
        <div className="people-grid">{filteredPeople.map(p => <div className="person-card card" key={p.id}><div className="person-card-cover"><span>✳</span><button className="more-btn" title="Block user" onClick={() => blockUser(p)}><MoreHorizontal size={18}/></button></div><Avatar profile={p} size="xl"/><h3>{p.display_name}</h3><p className="handle">@{p.username}</p><p className="person-bio">{p.bio || 'Still writing their story.'}</p><div className="person-actions"><button className={`btn ${p.isFollowing ? 'btn-soft' : 'btn-primary'} btn-small`} onClick={() => follow(p)}>{p.isFollowing ? <Check size={14}/> : <UserPlus size={14}/>} {p.isFollowing ? 'Following' : 'Follow'}</button><button className="btn btn-outline btn-small" onClick={() => requestFriend(p)} disabled={p.requestPending}>{p.requestPending ? 'Requested' : 'Add friend'}</button><button className="icon-btn small" title="Poke" onClick={() => poke(p)}><Zap size={16}/></button><button className="icon-btn small" title="Message" onClick={() => startChat(p)}><MessageCircle size={16}/></button><button className="icon-btn small" title="Report user" onClick={() => report('user', p.id, p.id)}><ShieldAlert size={16}/></button></div></div>)}</div>
        {filteredPeople.length === 0 && <div className="empty-state"><h3>No people found</h3><p>Try another name or username.</p></div>}
      </section>}

      {tab === 'Friends' && <section className="page-content"><div className="section-heading page-heading"><div><h2>Friend requests</h2><p>Say yes to a new connection.</p></div><span className="soft-tag">{requests.length} PENDING</span></div><div className="request-list">{requests.map(r => <div className="request-card card" key={r.id}><Avatar profile={r.sender}/><div className="request-person"><b>{r.sender?.display_name}</b><small>@{r.sender?.username} · {since(r.created_at)}</small></div><button className="btn btn-primary btn-small" onClick={() => respondRequest(r, 'accepted')}><Check size={14}/> Accept</button><button className="btn btn-soft btn-small" onClick={() => respondRequest(r, 'declined')}>Decline</button></div>)}</div>{!requests.length && <div className="empty-state card"><div className="empty-icon"><Users size={24}/></div><h3>All caught up</h3><p>Friend requests you receive will appear here.</p><button className="btn btn-primary" onClick={() => setTab('Explore')}>Find people</button></div>}</section>}

      {tab === 'Saved' && <section className="page-content"><div className="section-heading page-heading"><div><h2>Saved posts</h2><p>Posts you bookmarked for later.</p></div><span className="soft-tag">{feed.filter(p => savedPostIds.includes(p.id)).length} SAVED</span></div><div className="feed-list">{feed.filter(p => savedPostIds.includes(p.id)).map(post => <PostCard key={post.id} post={post} userId={session.user.id} saved onBookmark={() => toggleBookmark(post)} onReaction={reaction => toggleReaction(post, reaction)} onVote={optionId => votePoll(post.poll, optionId)} onHashtag={tag => { setActiveHashtag(tag); setTab('Home'); }} onLike={() => toggleLike(post)} onComment={addComment} onReport={() => report('post', post.id, post.user_id)} onDelete={() => deletePost(post.id)}/>)}{!feed.some(p => savedPostIds.includes(p.id)) && <div className="empty-state card"><div className="empty-icon"><Bookmark size={24}/></div><h3>No saved posts yet</h3><p>Use the bookmark icon on any post to save it here.</p><button className="btn btn-primary" onClick={() => setTab('Home')}>Browse feed</button></div>}</div></section>}

      {tab === 'Notifications' && <section className="page-content">
        <div className="section-heading page-heading">
          <div>
            <h2>Your notifications</h2>
            <p>{unread > 0 ? `You have ${unread} unread notification${unread === 1 ? '' : 's'}.` : 'You are all caught up.'}</p>
          </div>
          <button className="btn btn-outline btn-small" onClick={markNotificationsRead} disabled={unread === 0}>
            <CheckCheck size={15}/> Mark all read
          </button>
        </div>
        <div className="notification-filters">
          <button className={notificationFilter === 'all' ? 'active' : ''} onClick={() => setNotificationFilter('all')}>
            All ({notifications.length})
          </button>
          <button className={notificationFilter === 'unread' ? 'active' : ''} onClick={() => setNotificationFilter('unread')}>
            Unread ({unread})
          </button>
          <button className="notification-refresh" onClick={loadNotifications}>Refresh</button>
        </div>
        <div className="notification-list card">
          {notifications.filter(n => notificationFilter === 'all' || !n.read_at).map(n =>
            <div className={`notification-row ${!n.read_at ? 'unread' : ''}`} key={n.id}>
              <Avatar profile={n.actor}/>
              <button className="notification-copy notification-open" onClick={() => { if (!n.read_at) markNotificationRead(n.id); }}>
                <p><b>{n.actor?.display_name || 'Someone'}</b> {notificationText(n.type)}</p>
                <small>{since(n.created_at)} ago</small>
              </button>
              <span className="notification-icon">{n.type === 'like' ? <Heart size={16}/> : n.type === 'poke' ? <Zap size={16}/> : n.type === 'follow' ? <UserPlus size={16}/> : <Bell size={16}/>}</span>
              {!n.read_at && <button className="notification-read" title="Mark as read" aria-label="Mark notification as read" onClick={() => markNotificationRead(n.id)}><Check size={16}/></button>}
            </div>
          )}
        </div>
        {notifications.filter(n => notificationFilter === 'all' || !n.read_at).length === 0 &&
          <div className="empty-state card">
            <div className="empty-icon"><Bell size={24}/></div>
            <h3>{notificationFilter === 'unread' ? 'You have no unread notifications' : 'No notifications yet'}</h3>
            <p>When people interact with you on Raanbaai, their notifications will appear here.</p>
          </div>
        }
      </section>}

      {tab === 'Messages' && <section className="page-content chat-page"><div className="chat-layout card"><aside className="chat-list"><div className="chat-list-head"><h3>Messages</h3><button className="icon-btn small" onClick={() => setTab('Explore')} title="Start a conversation"><Plus size={17}/></button></div>{chats.map(c => <button key={c.id} className={`chat-person ${activeChat?.id === c.id ? 'selected' : ''}`} onClick={async () => { setActiveChat(c); await loadMessages(c.id); }}><Avatar profile={c.person}/><span><b>{c.person?.display_name}</b><small>@{c.person?.username}</small></span></button>)}{!chats.length && <p className="muted chat-empty">No conversations yet. Find someone to message.</p>}</aside><section className="chat-window">{activeChat ? <><div className="chat-header"><Avatar profile={activeChat.person}/><span><b>{activeChat.person?.display_name}</b><small>@{activeChat.person?.username}</small></span></div><div className="message-list">{messages.map(m => <div key={m.id} className={`message-bubble ${m.sender_id === session.user.id ? 'mine' : ''}`}><p>{m.body}</p><small>{since(m.created_at)}</small></div>)}{!messages.length && <div className="chat-intro">Say hello to {activeChat.person?.display_name} 👋</div>}</div><form className="message-compose" onSubmit={sendMessage}><input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Write a message…" maxLength="4000"/><button className="btn btn-primary btn-small" disabled={!messageText.trim()}><Send size={15}/></button></form></> : <div className="chat-placeholder"><div className="empty-icon"><MessageCircle size={24}/></div><h3>Your conversations</h3><p>Choose a chat or find someone new to message.</p><button className="btn btn-primary" onClick={() => setTab('Explore')}>Find people</button></div>}</section></div></section>}

      {tab === 'Profile' && <section className="page-content profile-page"><div className="profile-cover"><span>✳</span><button className="btn btn-outline btn-small" onClick={() => setEditProfile(!editProfile)}>{editProfile ? 'Cancel edit' : 'Edit profile'}</button></div><div className="profile-detail card"><Avatar profile={profile} size="xl"/><div className="profile-names"><h2>{profile?.display_name}</h2><p>@{profile?.username}</p><span>{profile?.bio || 'A new chapter on Raanbaai.'}</span></div><div className="profile-badge"><Sparkles size={15}/> Raanbaai MEMBER</div></div>
        {editProfile && <form className="card profile-edit stack-form" onSubmit={saveProfile}><h3>Edit your profile</h3><label>Display name<input value={editName} onChange={e => setEditName(e.target.value)} maxLength="60" required/></label><label>Bio<textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows="3" maxLength="240" placeholder="A little about you…"/></label><label>Profile photo<input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)}/></label><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button></form>}
        <div className="section-heading page-heading"><div><h2>Your posts</h2><p>Things you've shared with the community.</p></div></div><div className="feed-list">{feed.filter(p => p.user_id === session.user.id).map(post => <PostCard key={post.id} post={post} userId={session.user.id} saved={savedPostIds.includes(post.id)} onBookmark={() => toggleBookmark(post)} onReaction={reaction => toggleReaction(post, reaction)} onVote={optionId => votePoll(post.poll, optionId)} onHashtag={tag => { setActiveHashtag(tag); setTab('Home'); }} onLike={() => toggleLike(post)} onComment={addComment} onReport={() => report('post', post.id, post.user_id)} onDelete={() => deletePost(post.id)}/>)}{!feed.some(p => p.user_id === session.user.id) && <div className="empty-state card"><h3>Your story begins with a post</h3><p>Share something with your community.</p><button className="btn btn-primary" onClick={() => setTab('Home')}>Create a post</button></div>}</div>
      </section>}

      {tab === 'Admin' && isAdmin && <section className="page-content"><div className="section-heading page-heading"><div><h2>Community moderation</h2><p>Review reports and keep Raanbaai welcoming.</p></div><span className="soft-tag"><Shield size={13}/> ADMIN</span></div><div className="admin-notice"><ShieldAlert size={18}/><span>Admin actions are protected by database policies. Review each report before taking action.</span></div><div className="admin-list card">{reports.map(r => <div className="report-row" key={r.id}><div className="report-top"><span className={`report-status ${r.status}`}>{r.status}</span><small>{since(r.created_at)} ago</small></div><h3>{r.target_type === 'post' ? 'Reported post' : 'Reported user'} {r.target_user?.username ? `· @${r.target_user.username}` : ''}</h3><p>{r.reason}</p><small>Reported by @{r.reporter?.username || 'unknown'}</small>{r.status === 'pending' && <div className="report-actions"><button className="btn btn-primary btn-small" onClick={() => resolveReport(r.id, 'resolved')}><Check size={14}/> Resolve</button><button className="btn btn-soft btn-small" onClick={() => resolveReport(r.id, 'dismissed')}>Dismiss</button>{r.target_type === 'post' && <button className="btn btn-danger btn-small" onClick={() => deletePost(r.target_id)}>Delete post</button>}</div>}</div>)}{!reports.length && <div className="empty-state"><Shield size={26}/><h3>No reports to review</h3><p>New reports will appear here.</p><button className="btn btn-outline btn-small" onClick={loadReports}>Refresh reports</button></div>}</div></section>}

      <footer className="mobile-nav">{navItems.slice(0, 5).map(item => <button key={item.name} className={tab === item.name ? 'active' : ''} onClick={() => setTab(item.name)}><item.icon size={20}/>{item.count > 0 && <i/>}</button>)}</footer>
    </main>
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>;
}

function notificationText(type) {
  return ({ follow: 'started following you.', friend_request: 'sent you a friend request.', friend_accepted: 'accepted your friend request.', like: 'liked your post.', comment: 'commented on your post.', poke: 'poked you.', message: 'sent you a message.' })[type] || 'interacted with you.';
}

function PersonRow({ person, onFollow, onPoke, onMessage, compact }) {
  return <div className={`person-row ${compact ? 'compact' : ''}`}><Avatar profile={person}/><div className="person-row-info"><b>{person.display_name}</b><small>@{person.username}</small></div><button className="icon-btn small" title={person.isFollowing ? 'Unfollow' : 'Follow'} onClick={onFollow}>{person.isFollowing ? <Check size={15}/> : <UserPlus size={15}/>}</button>{!compact && <button className="icon-btn small" title="Poke" onClick={onPoke}><Zap size={15}/></button>}</div>;
}

function PostCard({ post, userId, onLike, onComment, onReport, onDelete, onProfile, saved = false, onBookmark, onReaction, onVote, onHashtag }) {
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const liked = post.likes?.some(l => l.user_id === userId);
  const myReaction = post.reactions?.find(r => r.user_id === userId)?.reaction;
  const myVote = post.poll?.votes?.find(v => v.user_id === userId)?.option_id;
  const submitComment = e => { e.preventDefault(); if (!comment.trim()) return; onComment(post.id, comment); setComment(''); setShowComments(true); };
  const bodyParts = (post.body || '').split(/(#[A-Za-z0-9_]+)/g);
  const reactionChoices = [{ key: 'love', emoji: '❤️', label: 'Love' }, { key: 'laugh', emoji: '😂', label: 'Laugh' }, { key: 'wow', emoji: '😮', label: 'Wow' }, { key: 'sad', emoji: '😢', label: 'Sad' }, { key: 'fire', emoji: '🔥', label: 'Fire' }];
  const totalVotes = post.poll?.votes?.length || 0;
  return <article className="post-card card">
    <div className="post-head"><Avatar profile={post.profiles}/><button className="post-author" onClick={onProfile}><b>{post.profiles?.display_name || 'Raanbaai member'}</b><small>@{post.profiles?.username || 'member'} · {since(post.created_at)}</small></button><button className="icon-btn small post-more" title="Report post" onClick={onReport}><MoreHorizontal size={18}/></button>{post.user_id === userId && <button className="icon-btn small" title="Delete post" onClick={onDelete}><X size={16}/></button>}</div>
    {post.body && <p className="post-body">{bodyParts.map((part, i) => part.startsWith('#') ? <button type="button" className="hashtag-link" key={`${part}-${i}`} onClick={() => onHashtag?.(part.slice(1))}>{part}</button> : <React.Fragment key={i}>{part}</React.Fragment>)}</p>}
    {post.image_url && <img className="post-image" src={post.image_url} alt="Post attachment" loading="lazy"/>}
    {post.poll && <div className="poll-card"><h4><BarChart3 size={17}/> {post.poll.question}</h4>{post.poll.options.map(option => { const count = option.votes?.length || 0; const percent = totalVotes ? Math.round(count / totalVotes * 100) : 0; return <button key={option.id} className={`poll-option ${myVote === option.id ? 'selected' : ''}`} onClick={() => !myVote && onVote?.(option.id)} disabled={Boolean(myVote)}><span className="poll-option-label">{option.label}</span><span className="poll-option-result">{percent}% · {count}</span><i style={{ width: `${percent}%` }}/></button>; })}<small>{totalVotes} vote{totalVotes === 1 ? '' : 's'}{myVote ? ' · You voted' : ' · Select an option to vote'}</small></div>}
    <div className="post-stats"><span><Heart size={14} fill={post.likes?.length ? 'currentColor' : 'none'}/>{post.likes?.length || 0} likes</span><span>{post.reactions?.length || 0} reactions</span><button onClick={() => setShowComments(!showComments)}>{post.comments?.length || 0} comments</button></div>
    <div className="post-actions"><button className={liked ? 'liked' : ''} onClick={onLike}><Heart size={18} fill={liked ? 'currentColor' : 'none'}/> Like</button><button onClick={() => setShowReactions(v => !v)}><span>{myReaction ? reactionChoices.find(r => r.key === myReaction)?.emoji : '😊'}</span> React</button><button className={saved ? 'liked' : ''} onClick={onBookmark} title={saved ? 'Remove bookmark' : 'Save post'}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'}/> {saved ? 'Saved' : 'Save'}</button><button onClick={() => setShowComments(!showComments)}><MessageCircle size={18}/> Comment</button><button onClick={() => navigator.clipboard?.writeText(window.location.href).catch(() => {})}><Activity size={17}/> Share</button></div>
    {showReactions && <div className="reaction-picker">{reactionChoices.map(r => <button key={r.key} className={myReaction === r.key ? 'selected' : ''} title={r.label} onClick={() => { onReaction?.(r.key); setShowReactions(false); }}>{r.emoji} <small>{r.label}</small></button>)}</div>}
    {showComments && <div className="comments-area">{post.comments?.map(c => <div className="comment-row" key={c.id}><Avatar profile={c.profiles} size="sm"/><div><b>{c.profiles?.display_name || c.profiles?.username || 'Member'}</b><p>{c.body}</p><small>{since(c.created_at)} ago</small></div></div>)}<form className="comment-form" onSubmit={submitComment}><input value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment…" maxLength="1000"/><button className="btn btn-primary btn-small" disabled={!comment.trim()}><Send size={14}/></button></form></div>}
  </article>;
}

export default App;
