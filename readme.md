# Kermite

## 概要

自作キーボードのエコシステムです。マイコンのファームウェアと、配列をカスタマイズするためのユーティリティソフトから成ります。ProMicro(マイコンボード)を使用した自作キーボードに対応しています。

<img src=https://i.gyazo.com/614fe1b005a323ae6d080fdb1f37cdc4.png width="500px"/>

(画像は2020年6月時点のものです。現在の表示とは異なります。)
## 機能
### キーマッピングの変更

ユーティリティソフトを使用してキーマッピングを視覚的に変更できます。キーマッピングはMCUの内蔵EEPROMに格納されます。

### ファームウェアの書き込み

ユーティリティソフトに、MCUにファームウェアを書き込む機能があります。対応キーボードのファームウェアはプリビルドされたものがリリースパッケージに含まれます。
### レイヤ状態のリアルタイム表示

使用しているキーボードのレイヤ状態をソフトウェア上でリアルタイムに表示する機能があります。文字入力時に、画面を見て現在有効なレイヤ上のキーマッピングを確認できます。
## 動作環境

### ハードウェア/ファームウェア
- ProMicroやATMega32u4マイコンをコントローラとして使用しているキーボード
- キーボードの品種毎に対応ファームウェアの実装が必要です

### ユーティリティソフト
- Windows 10
- Mac OS 10.15 Catalina

## フォルダ構成

./firmware ...マイコンのファーウェアです

./software ...PC上で動作するユーティリティソフトです。デバイスがなくても配列の検討などに利用できます。

<!--
## 導入方法

[対応済みのキーボードで使う場合(ユーザ向け)](/user_guide.md) 

[未対応のキーボードを対応する場合(開発者向け)](/developer_guide.md)
-->

## 開発環境

### ファームウェア
- AVR ATMega32u4マイコン
- C言語, avr-gcc, GNU Make

### ユーティリティソフト
- Node.js
- Electron
- petit-dom
- Typescript
## ライセンス
現在未定です。MITを検討しています。