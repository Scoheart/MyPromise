function runMicrotasks(callback) {
  if (typeof process !== "undefined" && process.nextTick) {
    // console.log("process.nextTick")
    process.nextTick(callback);
  } else if (typeof MutationObserver !== "undefined") {
    // console.log("MutationObserver")
    const div = document.createElement("div");
    const observer = new MutationObserver(callback);
    observer.observe(div, {
      childList: true,
    });
    div.innerHTML = "1";
  } else {
    setTimeout(callback, 0);
  }
}

class MyPromise {
  constructor(executor) {
    const _this = this;
    this.PromiseState = PENDING;
    this.PromiseResult = undefined;

    function resolve(value) {
      if (_this.PromiseState !== PENDING) return;
      _this.PromiseState = FULLFILLED;
      _this.PromiseResult = value;
    }
    function reject(reason) {
      if (_this.PromiseState !== PENDING) return;
      _this.PromiseState = REJECTED;
      _this.PromiseResult = reason;
    }

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  // then中的onFullfilled和onRejected 的回调队列
  _microTasks = [];
  _pushToMicroTasks(onSettled, PromiseState, resolve, reject) {
    this._microTasks.push({
      onSettled,
      PromiseState,
      resolve,
      reject,
    });
  }
  // 从回调队列中一个一个拿出来执行
  _shiftMicroTasks() {
    if (this.PromiseState === PENDING) return;
    while (this._microTasks.length) {
      this._runMicroTasks(this._microTasks.shift());
    }
  }
  // 执行操作
  _runMicroTasks({ onSettled, PromiseState, resolve, reject }) {
    runMicrotasks(() => {
      // 选择成功的回调 或者 失败的回调
      if (this.PromiseState !== PromiseState) return;
      // 处理不是函数的情况
      else if (typeof onSettled !== "function") {
        this.PromiseState === FULLFILLED
          ? resolve(this.PromiseResult)
          : reject(this.PromiseResult);
      } else {
        // 执行成功的回调 或者 执行失败的回调
        try {
          const result = onSettled(this.PromiseResult);
          console.log(this._isPromise(result));
          if (this._isPromise(result)) {
            result.then(resolve, reject);
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      }
    });
  }

  _isPromise(obj) {
    return !!(obj && typeof obj === "object" && typeof obj.then === "function");
  }

  then(onFullfilled, onRejected) {
    // if (this.PromiseState === FULLFILLED) {
    //     onFullfilled(this.PromiseResult)
    // }
    // if (this.PromiseState === REJECTED) {
    //     onRejected(this.PromiseResult)
    // }
    const _this = this;
    return new MyPromise(function (resolve, reject) {
      _this._pushToMicroTasks(onFullfilled, FULLFILLED, resolve, reject);
      _this._pushToMicroTasks(onRejected, REJECTED, resolve, reject);
      _this._shiftMicroTasks();
    });
  }
}

MyPromise.prototype.catch = function (onRejected) {
  return MyPromise.prototype.then(undefined, onRejected);
};

MyPromise.prototype.finally = function (onFinally) {
  return MyPromise.prototype.then(
    (value) => {
      onFinally();
      return value;
    },
    (reason) => {
      onFinally();
      throw reason;
    }
  );
};

MyPromise.resolve = function (value) {
  if (value instanceof Promise) {
    return value;
  }

  return new Promise((resolve, reject) => {
    if (isPromise(value)) {
      value.then(resolve, reject);
    } else {
      resolve(value);
    }
  });
};

MyPromise.reject = function (reason) {
  return new Promise((reject, reject) => {
    reject(reason);
  });
};

/**
 * 如何确保顺序
 * 如何确定全部执行完毕
 * @param {*} iterable
 * @returns
 */
MyPromise.all = function (iterable) {
  return new Promise((resolve, reject) => {
    try {
      const results = [];
      let promiseCount = 0;
      let completedCount = 0;

      if (iterable.length === 0) {
        resolve(results);
      }

      for (const promise of iterable) {
        let index = promiseCount;
        promiseCount += 1;
        // 处理不是promise的情况
        Promise.resolve(promise).then((value) => {
          completedCount += 1;
          results[index] = value;
          if (completedCount === promiseCount) {
            resolve(results);
          }
        }, reject);
      }
    } catch (error) {
      reject(error);
    }
  });
};

MyPromise.allSettled = function (iterable) {
  const result = [];
  for (const promise of iterable) {
    result.push(
      Promise.resolve(promise).then((value) => ({
        status: "fullfuilled",
        value,
      })),
      (reason) => ({
        status: "rejected",
        reason,
      })
    );
  }
  return Promise.all(result);
};

MyPromise.race = function (iterable) {
  return new Promise(function (resolve, reject) {
    for (const promise of iterable) {
      Promise.resolve(promise).then(resolve, reject);
    }
  });
};

MyPromise.any = function (iterable) {
  return new Promise(function (resolve, reject) {
    const errors = [];
    for (const promise of iterable) {
      Promise.resolve(promise).then(
        (value) => {
          resolve(value);
        },
        (reason) => {
          errors.push(reason);
          if (errors.length === promise.length) {
            reject(new AggerageteError(result));
          }
        }
      );
    }
  });
};
