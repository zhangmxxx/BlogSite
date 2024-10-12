---
cover: /assets/images/inline-asm.png
icon: pen-to-square
date: 2024-10-12
category:
  - work
tag:
  - assembly
  - C
sticky: true
excerpt: <p>在重新实现 𝟐𝐛𝐚𝐋-𝐒𝐂𝐈（reverse）内联汇编时，以新的视角解释了2年前悬而未决的问题，同时也碰到了一些先前未曾遇到的难题。</p>
---
# 内联汇编拾遗

## Inline asm

基础的内联汇编语法参见 [Details](https://ibiblio.org/gferg/ldp/GCC-Inline-Assembly-HOWTO.html)。

除此之外，在实践过程中还总结出了如下值得注意的特性：

### 1. Numbering the Operands
> Numbering is done as follows. If there are a total of n operands (both input and output inclusive), then the first output operand is numbered $0$, continuing in increasing order, and the last input operand is numbered $n-1$. The maximum number of operands is as we saw in the previous section.

编号严格按照操作数进行分配，而不是根据所分配的寄存器。如果为两个操作数分配了同样的寄存器，它们仍然会占用两个编号。考虑如下示例：
```c
int64_t asm_add(int64_t a, int64_t b) {
  int64_t res;
  asm volatile(
    "add %2, %0"
    : "=r"(res)
    : "0"(a), "r"(b)
  );
  return res;
}
```
### 2. Register Conflicts
当通过 `r' 为各参数分配寄存器时，编译器只保证为其分配可用寄存器，并不会考虑因寄存器复用导致的覆盖等问题。当存在多参数时，较为保险的做法是显式指定寄存器。
### 3. Instruction Convention
某些指令会隐式使用固定的寄存器，用于存放运算结果、操作数等。例如 shr 右移指令，会默认使用 `%cl` 的值作为移位数。因此，在编写相关汇编代码时，需要遵从这些 convention。
### 4. `+' modifier
> Means that this operand is both read and written by the instruction.

written 和 read 可以分别理解为用作输出和输入。输出自不必说，而用作输入的含义为，内联汇编读取到该变量对应的寄存器的初始值，与其进入内联汇编块之前的值一致。否则，读取到的值可能是该寄存器中残余的未定义值。
```c
/* example for 2, 3, 4 */
int asm_popcnt(uint64_t x) {
  uint64_t s = 0, i = 0;
  asm volatile(
    //"mov $0, %%rsi;" // 4. otherwise, %rsi must be cleared
    "popcnt_loop:;"
    "cmp $64, %1;"
    "jge popcnt_end;"
    /* loop_body_start */
    "mov %2, %%rax;"
    "mov %1, %%rcx;" // 3. shift cnt must be in %cl
    "shr %%cl, %%rax;"
    "and $0x1, %%rax;"
    "add %%rax, %0;"
    /* loop_body_end  */
    "inc %1;"
    "jmp popcnt_loop;"
    "popcnt_end:;"
    // 2. other wise i and s will be assigned the same reg
    : "+D"(s) // 4. `+' modifier
    : "b"(i), "d"(x)
    : "rax", "rcx"
  );
  return (int)s;
}
```
## Implementing `setjmp()` and `longjmp()`
在正常实现 `setjmp()` 和 `longjmp()` 的情况下，程序首先会进入 `setjmp()` 中设置快照，返回后，进入 `r == 0` 分支，在 `longjmp()` 中跳转到 `setjmp()` 返回前的状态，随后进入另一分支，最终返回。
```c
int main() {
  asm_jmp_buf buf;
  int r = asm_setjmp(buf);
  if (r == 0) {
    asm_longjmp(buf, 123);
  } else {
    assert(r == 123);
    printf("PASSED.\n");
  }
}
```
### 1. Before Implementing
原始状态下，实现直接调用了库函数。但是，即便在这种情况下，程序仍然无法正常运行：在进入了一次 `r == 0` 分支后，程序直接退出了。
其实原因很简单：库函数 `longjmp()` 返回的是 `setjmp()` 执行后的位置。（这里暂时还不需要区分是 `setjmp()` return 之前还是之后）此时，控制流位于 `asm_setjmp()` 返回之前的状态。但是，此时的**函数栈帧仍然是 `asm_longjmp()` 的函数栈帧**，而函数返回地址是存放在栈帧上的，因此，控制流实际上返回到了 line 5 之后的位置，随即 `main()` 执行完毕。
```c
/* in asm.h */
#include <setjmp.h>
#define asm_jmp_buf jmp_buf
/* in asm-impl.c */
int asm_setjmp(asm_jmp_buf env) {
  return setjmp(buf);
}
void asm_longjmp(asm_jmp_buf env, int val) {
  longjmp(env, buf);
}
```
### 2. Which Regs to Save
翻看标准库，发现其保存了8个寄存器，那么，这8个寄存器究竟是哪些呢？ `setjmp()` 需要保存的寄存器，实际上就是 callee saved registers：这些寄存器是 `setjmp()` 需要保存的，而当 `setjmp()` 交出控制权的时候，自然也就需要将这些寄存器值保留下来。其余的则反之。
### 3. Before or After Return
另一问题是，`longjmp()` 返回时，究竟应该返回到 `setjmp()` 内部执行流的末尾，还是 `setjmp()` caller 的执行流中？有两个需求，使得这个问题有了确定的答案：
#### Different Return Value
`setjmp()` 需要支持不同的返回值。如果采取前者，那么 `setjmp()` 的汇编代码应当大致如下：
```asm
/* save regs to buf */
mov $0x0, %%eax /* if real call, set 0 as return value */
anchor: /* longjmp back to here, with eax = val */
ret
```
但此时，函数的栈帧会发生问题（why？）
#### Return PC
前文提到，返回地址是存放在栈上的。因此，如果采取前者，回到 `setjmp()` 返回前，那么一定会返回到 `longjmp()` 的栈帧上存放的返回地址。

综上所述，必须返回到 `setjmp()` caller 的执行流。于是乎，我们保存的 rip 实际上是 `setjmp()` 的返回地址，rsp 和 rbp 是 `setjmp()` 调用者的对应值。但，**x64 的函数调用 convention 与 IA-32 有巨大差别** [Overview](https://www.cnblogs.com/wingsummer/p/16078629.html)，在调试时，一度被始终为 0x1 的 rbp 搞得怀疑人生。简单来说，x64 不再采用 rbp 记录栈底，而是只使用 rsp。函数调用过程中，旧 rsp 值被存放在 `8(%rsp)`，而返回地址，则存放在 `(%rsp)`。最终得到的实现如下：
```c
/* in asm.h */
typedef struct {
  uint64_t regs[64];
} asm_jmp_buf[1];

/* in asm-impl.c */
int asm_setjmp(asm_jmp_buf env) {
  asm volatile(
    "mov %%rbx, (%0);"
    "leaq 8(%%rsp), %%rcx;"
    "mov %%rcx, 8(%0);"
    "mov %%rbp, 16(%0);"
    "mov %%r12, 24(%0);"
    "mov %%r13, 32(%0);"
    "mov %%r14, 40(%0);"
    "mov %%r15, 48(%0);"
    "mov (%%rsp), %%rcx;" // return back to caller
    "mov %%rcx, 56(%0);"
    : /* no output */
    : "a"(env) // get the addr
    : "memory", "rcx"
  );
  return 0;
}

void asm_longjmp(asm_jmp_buf env, int val) {
  asm volatile (
    "mov 0(%0), %%rbx;" 
    "mov 8(%0), %%rsp;" 
    "mov 16(%0), %%rbp;"
    "mov 24(%0), %%r12;"
    "mov 32(%0), %%r13;"
    "mov 40(%0), %%r14;"
    "mov 48(%0), %%r15;"
    "mov 56(%0), %%rdx;"
    "test %1, %1;"   
    "jnz 1f;"
    "incl %1;"
    "1:;"
    "movl %1, %%eax;" // set return value for previous setjmp
    "jmp *%%rdx;"
    : /* no output */
    : "a" (env), "c" (val)
    : "rbx", "r12", "r13", "r14", "r15", "rdx"
  );
  assert(0);
}

```

> 悬而未决的问题:
> 可以看到, 上面的定义是将 `asm_jmp_buf` 定义成了一个数组类型, 从而使得 `asm_jmp_buf buf;` 定义的变量为指针类型. 但如果将其定义为结构体, 使得 buf 作为局部变量存放在栈上, 理论上也可行, 但实际上, 会在准备 `asm_longjmp()` 的参数 env 时, 将栈上的 env 变量覆盖掉. 这是否是 UB ?