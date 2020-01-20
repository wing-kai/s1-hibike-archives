const PAGE_THREAD_LIST = 'page-thread-list'
const PAGE_POST_LIST = 'page-post-list'

const rename = num => num > 99 ? num : num > 9 ? '0' + num : '00' + num

const getJSON = function(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) {
        return
      }

      try {
        resolve(JSON.parse(xhr.responseText))
      } catch (err) {
        reject(err)
      }
    }
    xhr.send()
  })
}

const smartImage = {
  props: {
    url: String
  },
  data() {
    return {
      noAvatar: false
    }
  },
  template:
    `<img class="avatar" v-if="noAvatar" src="https://avatar.saraba1st.com/images/noavatar_middle.gif"/>` +
    `<img class="avatar" v-else :src="url" @error="handleError"/>`
  ,
  methods: {
    handleError() {
      this.noAvatar = true
    }
  }
}

new Vue({
  el: document.getElementById('container'),
  components: {
    smartImage: smartImage
  },
  data() {
    return {
      page: PAGE_THREAD_LIST,
      threadID: 0,
      pageIndex: 1,
      threadTitle: '',
      threads: [],
      list: [],
      maxPageIndex: 1,
      scrollButton: 1 // 0: toTop 1: toBottom
    }
  },
  watch: {
    page(page) {
      if (page === PAGE_THREAD_LIST) {
        this.threadID = 0
        this.threadTitle = ''
        this.pageIndex = 1
        this.list = []
      }
    }
  },
  template:
`
  <div class="container">
    <h5 class="mt-4" v-if="page === '${PAGE_THREAD_LIST}'">主题列表</h5>
    <template v-else>
      <h5 class="mt-4">{{threadTitle}}</h5>
      <div class="row mt-4"><div class="col"><div class="btn btn-primary" @click="returnToThreadList">返回主题列表</div></div></div>
    </template>
    <template v-if="page === '${PAGE_THREAD_LIST}'">
      <div class="card mt-4" v-for="thread in threads" :key="thread.id" style="cursor:pointer" @click="viewList(thread.id,1)">
        <div class="card-body">{{thread.title}}</div>
      </div>
    </template>
    <template v-else>
      <div class="card mt-4" v-for="post in list" :key="post.id">
        <div class="card-header"><smart-image :url="post.avatar" alt="avatar.jpg" width="50px" height="50px"/>&nbsp;{{post.username}}&nbsp;<small class="text-muted">{{post.date}}</small></div>
        <div class="card-body" v-html="post.message"></div>
      </div>
      <div class="mt-4">
        <div class="row">
          <div class="col-auto mr-auto col-xs-12 mb-3"><span class="text-muted">第&nbsp;{{pageIndex}}&nbsp;页</span></div>
          <div class="col-lg-3 col-sm-3 col-xs-12 mb-3"><input type="number" class="form-control" :value="pageIndex" min="1" :max="maxPageIndex" @change="handleChangePageIndex"/></div>
          <div class="col-auto col-xs-12 mb-3">
            <ul class="pagination justify-content-center">
              <li class="page-item disabled" v-if="pageIndex === 1">
                <a class="page-link">首页</a>
              </li>
              <li class="page-item" v-else>
                <a class="page-link" href="javascript:;" @click="viewList(threadID, 1)">首页</a>
              </li>
              <li class="page-item disabled" v-if="pageIndex === 1">
                <a class="page-link">上一页</a>
              </li>
              <li class="page-item" v-else>
                <a class="page-link" href="javascript:;" @click="viewList(threadID, pageIndex - 1)">上一页</a>
              </li>
              <li class="page-item">
                <a class="page-link" href="javascript:;" @click="viewList(threadID, pageIndex + 1)">下一页</a>
              </li>
              <li class="page-item disabled" v-if="pageIndex === maxPageIndex">
                <a class="page-link">末页</a>
              </li>
              <li class="page-item" v-else>
                <a class="page-link" href="javascript:;" @click="viewList(threadID, maxPageIndex)">末页</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <button v-if="scrollButton === 0" class="btn btn-secondary btn-fast-scroll" @click="fastScroll(true)">顶部</button>
      <button v-else class="btn btn-secondary btn-fast-scroll" @click="fastScroll(false)">底部</button>
    </template>
  </div>
`,
  mounted() {
    getJSON('./threads/list.json').then(json => {
      this.threads = json.list
    }).then(this.getHistoryState)

    window.onpopstate = this.getHistoryState
    window.onscroll = e => window.requestAnimationFrame(this.handleScroll)
  },
  methods: {
    returnToThreadList() {
      this.page = PAGE_THREAD_LIST
      history.pushState(
        { page: PAGE_THREAD_LIST },
        document.title,
        window.location.origin + window.location.pathname
      )
    },
    getHistoryState() {
      if (history.state === null) {
        return history.replaceState(
          { page: PAGE_THREAD_LIST },
          document.title,
          window.location.origin + window.location.pathname
        )
      }

      if (history.state.page === PAGE_THREAD_LIST) {
        this.page = PAGE_THREAD_LIST
        return
      }

      // history.state.page === PAGE_THREAD_LIST
      this.viewList(
        history.state.threadID,
        history.state.pageIndex,
        false
      )
    },
    viewThreads() {
      getJSON('./threads/list.json').then(json => {
        this.threads = json.list
      })
    },
    viewList(threadID, pageIndex, newState = true) {
      const maxPageIndex = this.threads.find(thread => thread.id === +threadID).pageCount
      this.list = []
      this.page = PAGE_POST_LIST
      this.pageIndex = pageIndex
      this.threadID = threadID
      this.maxPageIndex = maxPageIndex
      if (newState) {
        window.history.pushState(
          { page: PAGE_POST_LIST, pageIndex: pageIndex, threadID: threadID },
          document.title,
          window.location.origin + window.location.pathname
        )
      }

      getJSON(`./threads/thread_${threadID}/thread_${threadID}_${rename(pageIndex)}.json`)
        .then(json => {
          this.threadTitle = json.Variables.thread.subject
          this.list = json.Variables.postlist.map(postItem => ({
            id: postItem.pid,
            avatar: postItem.authorid.replace(/^(\d\d)(\d\d)(\d\d)$/, 'https://avatar.saraba1st.com/data/avatar/000/$1/$2/$3_avatar_big.jpg'),
            username: postItem.username,
            message: postItem.message,
            date: postItem.dateline
          }))
          setTimeout(() => window.scrollTo(0, 0), 0)
        })
    },
    handleChangePageIndex(e) {
      let pageIndex = parseInt(+e.currentTarget.value)

      if (isNaN(pageIndex) || (pageIndex < 1)) {
        pageIndex = 1
      } else if (pageIndex > this.maxPageIndex) {
        pageIndex = this.maxPageIndex
      }

      this.viewList(this.threadID, pageIndex)
    },
    handleScroll() {
      this.scrollButton = window.scrollY < 100 ? 1 : 0
    },
    fastScroll(toTop) {
      window.scrollTo(0, toTop ? 0 : 99999)
    }
  }
})