# Kermite

## 概要

自作キーボード用のソフトウェアです。MCU上で動くファームウェアと、キーマッピングを設定するためのユーティリティソフトがあります。ProMicro(マイコンボード)を使用した自作キーボードに対応しています。

<img src=https://i.gyazo.com/dd06a2d9e1c98815cd69394911a5a29b.png width="240px"/>

## 機能
### キーマッピングの変更

ユーティリティソフトを使用してキーマッピングを視覚的に変更できます。キーマッピングはMCU内蔵のデータ保存領域に格納されます。

### ファームウェアの書き込み

ユーティリティソフトに、MCUにファームウェアを書き込む機能があります。対応キーボードのファームウェアは事前にビルドされたものを利用できます。
### レイヤ状態のリアルタイム表示

使用しているキーボードのレイヤ状態をリアルタイムに表示する機能があります。文字入力時に、画面を見て現在アクティブなレイヤ上のキーマッピングを確認できます。
## 動作環境

### ハードウェア/ファームウェア
- ProMicroやATMega32u4,RP2040を使用しているキーボード
- キーボードのモデル毎に対応ファームウェアの実装が必要です

### ユーティリティソフト
- Mac OS 10.15 Catalina
- Windows 10

## フォルダ構成

./firmware ...ファーウェアです。

./software ...PC上で動作するユーティリティソフトです。デバイスがなくても配列の検討などに利用できます。

## 開発環境

### ファームウェア
- AVR ATMega32u4, Raspberry Pi RP2040
- C言語, avr-gcc, arm-none-eabi-gcc, GNU Make

### ユーティリティソフト
- Electron
- Typescript

## 導入方法

現在開発中のため正式なリリースがまだありません。

現状のものを動かしてみたいという方は、[こちら](https://github.com/kermite-org/Kermite/releases )にデバッグ用にビルドしたバイナリがあるのでご利用ください。

使い方は以下のドキュメントを参照してください。

[ユーティリティソフトの使い方](./document/usage/tutorial.md)

## 開発状況
キー入力やレイヤなどの基本的な機能は実装が概ね固まりました。現在周辺部品(LCD,RGBLEDなど)の対応を進めています。またユーティリティソフトの改修を行っています。2021年の夏頃にリリースする予定です。
## ライセンス
MITライセンスです。