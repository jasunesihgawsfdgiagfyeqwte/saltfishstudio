/* ============================================================
   Community: Username/Password Auth + Supabase Comments
   ============================================================

   SETUP:
   1. Go to supabase.com, create a project (free tier)
   2. Get Project URL and anon public key from Settings > API
   3. Go to Auth > Settings > disable "Confirm email"
   4. Run this SQL in SQL Editor to create the comments table:

      create table comments (
        id bigint generated always as identity primary key,
        created_at timestamptz default now(),
        user_id uuid references auth.users(id),
        nick text not null,
        content text not null check (char_length(content) <= 500)
      );

      alter table comments enable row level security;

      create policy "Anyone can read comments"
        on comments for select using (true);

      create policy "Logged-in users can insert"
        on comments for insert
        with check (auth.uid() = user_id);

   ============================================================ */

(function () {
  'use strict';

  // ======== CONFIG (REPLACE THESE) ========
  var SUPABASE_URL = 'https://azverufikxjwolajtcow.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dmVydWZpa3hqd29sYWp0Y293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDk0MDQsImV4cCI6MjA5NTMyNTQwNH0.98liMV8uKSIU4oQB3fsAsVlUCXdcNIqccA5_0haV5go';
  // =========================================

  var EMAIL_DOMAIN = '@vc.local'; // invisible to user
  var sb = null;
  var currentUser = null;

  // ---------- Init Supabase ----------
  if (window.supabase) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    initSession();
  } else {
    console.error('[Community] Supabase SDK not loaded');
    var hint = document.getElementById('cmtHint');
    if (hint) hint.querySelector('p').textContent = '评论系统加载失败，请刷新重试';
  }

  async function initSession() {
    var { data } = await sb.auth.getSession();
    if (data.session) {
      currentUser = data.session.user;
      showLoggedIn();
    }
    loadComments();
  }

  // ---------- Textarea char count ----------
  var cmtText = document.getElementById('cmtText');
  var cmtLen = document.getElementById('cmtLen');
  if (cmtText && cmtLen) {
    cmtText.addEventListener('input', function () {
      cmtLen.textContent = cmtText.value.length;
    });
  }

  // ---------- Auth Modal ----------
  window.showAuth = function (tab) {
    document.getElementById('authModal').classList.add('open');
    switchTab(tab || 'login');
  };

  window.closeAuth = function (e) {
    if (e && e.target !== e.currentTarget && !e.target.closest('.auth-close')) return;
    document.getElementById('authModal').classList.remove('open');
    clearAuthError();
  };

  window.switchTab = function (tab) {
    document.querySelectorAll('.auth-tab').forEach(function (t) {
      t.classList.toggle('act', t.dataset.tab === tab);
    });
    document.getElementById('authLogin').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('authRegister').style.display = tab === 'register' ? 'block' : 'none';
    clearAuthError();
  };

  function clearAuthError() {
    var el = document.getElementById('authError');
    if (el) el.textContent = '';
  }

  function showAuthError(msg) {
    var el = document.getElementById('authError');
    if (el) el.textContent = msg;
  }

  // ---------- Register ----------
  window.doRegister = async function () {
    if (!sb) return showAuthError('系统未就绪，请刷新页面');
    var nick = document.getElementById('regNick').value.trim();
    var user = document.getElementById('regUser').value.trim();
    var pass = document.getElementById('regPass').value;

    if (!nick || nick.length < 1 || nick.length > 16) return showAuthError('昵称 1-16 个字符');
    if (!user || user.length < 3 || user.length > 20) return showAuthError('用户名 3-20 个字符');
    if (!/^[a-zA-Z0-9_]+$/.test(user)) return showAuthError('用户名只能包含字母、数字、下划线');
    if (!pass || pass.length < 6) return showAuthError('密码至少 6 位');

    var { data, error } = await sb.auth.signUp({
      email: user + EMAIL_DOMAIN,
      password: pass,
      options: { data: { nick: nick, username: user } }
    });

    if (error) {
      if (error.message.includes('already registered')) return showAuthError('用户名已被注册');
      return showAuthError(error.message || '注册失败');
    }

    currentUser = data.user;
    document.getElementById('authModal').classList.remove('open');
    showLoggedIn();
  };

  // ---------- Login ----------
  window.doLogin = async function () {
    var user = document.getElementById('loginUser').value.trim();
    var pass = document.getElementById('loginPass').value;

    if (!user || !pass) return showAuthError('请输入用户名和密码');

    var { data, error } = await sb.auth.signInWithPassword({
      email: user + EMAIL_DOMAIN,
      password: pass
    });

    if (error) {
      if (error.message.includes('Invalid login')) return showAuthError('用户名或密码错误');
      return showAuthError(error.message || '登录失败');
    }

    currentUser = data.user;
    document.getElementById('authModal').classList.remove('open');
    showLoggedIn();
  };

  // ---------- Logout ----------
  window.doLogout = async function () {
    await sb.auth.signOut();
    currentUser = null;

    var navUser = document.getElementById('navUser');
    if (navUser) {
      navUser.innerHTML = '<button class="auth-trigger" onclick="showAuth(\'login\')">\u767b\u5f55</button>';
    }

    var hint = document.getElementById('cmtHint');
    var input = document.getElementById('cmtInput');
    if (hint) hint.style.display = '';
    if (input) input.style.display = 'none';
  };

  // ---------- Show logged in ----------
  function showLoggedIn() {
    if (!currentUser) return;
    var meta = currentUser.user_metadata || {};
    var nick = meta.nick || meta.username || 'User';

    var navUser = document.getElementById('navUser');
    if (navUser) {
      navUser.innerHTML =
        '<div class="nav-user-info">' +
          '<span class="nav-user-avatar">' + escHtml(nick.charAt(0)) + '</span>' +
          '<span>' + escHtml(nick) + '</span>' +
        '</div>';
    }

    var hint = document.getElementById('cmtHint');
    var input = document.getElementById('cmtInput');
    var cmtNick = document.getElementById('cmtNick');
    var cmtAvatarLetter = document.getElementById('cmtAvatarLetter');

    if (hint) hint.style.display = 'none';
    if (input) input.style.display = 'block';
    if (cmtNick) cmtNick.textContent = nick;
    if (cmtAvatarLetter) cmtAvatarLetter.textContent = nick.charAt(0);
  }

  // ---------- Image Preview ----------
  var pendingFile = null;

  window.previewImage = function (input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('图片不能超过 5MB'); input.value = ''; return; }
    pendingFile = file;
    var reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('cmtPreviewImg').src = e.target.result;
      document.getElementById('cmtPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  };

  window.clearImage = function () {
    pendingFile = null;
    document.getElementById('cmtPreview').style.display = 'none';
    document.getElementById('cmtPreviewImg').src = '';
    document.getElementById('cmtFile').value = '';
  };

  // ---------- Submit Comment ----------
  window.submitComment = async function () {
    var { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session) return showAuth('login');
    currentUser = sessionData.session.user;

    var text = document.getElementById('cmtText');
    var content = text.value.trim();
    if (!content && !pendingFile) return;
    if (content.length > 500) return;

    var btn = document.getElementById('cmtSubmit');
    btn.disabled = true;
    btn.textContent = '发送中…';

    var meta = currentUser.user_metadata || {};
    var nick = meta.nick || meta.username || 'User';
    var imageUrl = '';

    // Upload image if present
    if (pendingFile) {
      var ext = pendingFile.name.split('.').pop() || 'jpg';
      var path = currentUser.id + '/' + Date.now() + '.' + ext;
      var { data: upData, error: upErr } = await sb.storage
        .from('comment-images')
        .upload(path, pendingFile, { contentType: pendingFile.type });
      if (upErr) { alert('图片上传失败'); btn.disabled = false; btn.textContent = '发表留言'; return; }
      var { data: urlData } = sb.storage.from('comment-images').getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    var finalContent = content + (imageUrl ? '\n' + imageUrl : '');

    var { error } = await sb.from('comments').insert({
      user_id: currentUser.id,
      nick: nick,
      content: finalContent
    });

    btn.disabled = false;
    btn.textContent = '发表留言';

    if (error) { alert('发送失败，请稍后重试'); return; }

    text.value = '';
    document.getElementById('cmtLen').textContent = '0';
    clearImage();
    prependComment({ id: null, nick: nick, content: finalContent, created_at: new Date().toISOString(), user_id: currentUser.id });
  };

  // ---------- Delete Comment ----------
  window.deleteComment = async function (id, el) {
    if (!confirm('确定删除这条留言？')) return;
    var { error } = await sb.from('comments').delete().eq('id', id);
    if (error) { alert('删除失败'); return; }
    el.closest('.cmt-item').remove();
    // Check if list is empty
    var listEl = document.getElementById('cmtList');
    if (listEl && !listEl.querySelector('.cmt-item')) {
      listEl.innerHTML = '<div class="cmt-empty">还没有留言，来做第一个吧！</div>';
    }
  };

  // ---------- Load Comments ----------
  async function loadComments() {
    var listEl = document.getElementById('cmtList');
    var loadingEl = document.getElementById('cmtLoading');
    if (!listEl || !sb) {
      if (loadingEl) loadingEl.textContent = '评论加载失败';
      return;
    }

    var { data, error } = await sb
      .from('comments')
      .select('id, nick, content, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (loadingEl) loadingEl.textContent = '评论加载失败';
      return;
    }

    if (loadingEl) loadingEl.style.display = 'none';

    if (!data || data.length === 0) {
      listEl.innerHTML = '<div class="cmt-empty">还没有留言，来做第一个吧！</div>';
      return;
    }

    var html = '';
    data.forEach(function (item) { html += buildCommentHtml(item); });
    listEl.innerHTML = html;
  }

  function prependComment(data) {
    var listEl = document.getElementById('cmtList');
    if (!listEl) return;
    var empty = listEl.querySelector('.cmt-empty');
    if (empty) empty.remove();
    var div = document.createElement('div');
    div.innerHTML = buildCommentHtml(data);
    var node = div.firstChild;
    node.classList.add('cmt-new');
    listEl.insertBefore(node, listEl.firstChild);
  }

  function buildCommentHtml(data) {
    var time = formatTime(data.created_at);
    var letter = data.nick ? data.nick.charAt(0) : '?';
    var isOwn = currentUser && data.user_id === currentUser.id;
    var delBtn = isOwn && data.id ? '<button class="cmt-del" onclick="deleteComment(' + data.id + ',this)" title="删除">×</button>' : '';
    return '<div class="cmt-item">' +
      '<span class="cmt-item-avatar">' + escHtml(letter) + '</span>' +
      '<div class="cmt-item-body">' +
        '<div class="cmt-item-head">' +
          '<span class="cmt-item-nick">' + escHtml(data.nick) + '</span>' +
          '<span class="cmt-item-time">' + time + '</span>' +
          delBtn +
        '</div>' +
        '<p class="cmt-item-text">' + renderContent(data.content) + '</p>' +
      '</div>' +
    '</div>';
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var now = new Date();
    var diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  // Render text with image URL detection
  function renderContent(str) {
    if (!str) return '';
    var imgRe = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?/gi;
    // Split text by image URLs
    var parts = str.split(imgRe);
    var imgs = str.match(imgRe) || [];
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      html += escHtml(parts[i]);
      if (i < imgs.length) {
        var src = escHtml(imgs[i]);
        html += '<img class="cmt-img" src="' + src + '" alt="image" loading="lazy" onclick="openLB(this.parentNode.parentNode)">';
      }
    }
    return html;
  }

  function escHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Enter key support
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var modal = document.getElementById('authModal');
    if (!modal || !modal.classList.contains('open')) return;
    if (document.getElementById('authLogin').style.display !== 'none') {
      doLogin();
    } else {
      doRegister();
    }
  });

})();
