import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  GraduationCap,
  Info,
  KeyRound,
  Mail,
  MessageSquareText,
  Trash2,
} from 'lucide-react'
import { deleteGroupRoom, getRoomDetails } from '../lib/firebaseChat'
import type { ConversationSummary, NavigationSection, Profile, RoomDetails } from '../types'
import { Avatar } from './Avatar'
import { BottomNavigation } from './BottomNavigation'

const classroomRoomImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCABfALEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9L11iVMfvFYeh4rE8a6qsmm26kkZmk6nj/j3lrlLTxEm1TFcXYBP3ZHV1xnuSM/rWXr3iuHUkgtlvbd9kzEqsUiMP3Mg/iJB61cHGbvFnM6iasev6dqUb2FsVlHMKd/YVneK7wPpYUsMGVec/WuO0fxWz6baK9nNgW8Z3oyOMbevXP6VDq+vQXWnSNblwq3MasGjaM7s+jAZ6jmrVO2pbmrHc/YdE1jTLcalY2026BAWZRuxt9ev615n8Q/DP9mgf8I9q11bw7AXtxJleT/Cf4fwrooNVuotJ0r7PNEPNgQOXjLH/AFYIxg1g+IL6a4klWeYSfuVIITbj5/Sp9kpp3CU7Hy/8Y9PI1a1+0nc7xKS55Y4kHU963fAfwNs/Gej2+oQeMrO1P2aS5u47qHPkKrlc53DK9OTgVX+OcQbWNPx3g6/9tK9p+Fy2Unwt0Szk0ZL0XlncWl1tZY2ELysGLNwduOOueRXlww8XVcHsd8qrhSjJHH6X+zjcaZcSjSPizZQNbHM8S22+NMKGO5TKMfKyntwynuK7S0+H9nYR20OsfEfTGe6UtEfsoQSBfvEZlPTIz9a17fwt4b00pptn4NC280bIx/tEjYAAAcbs5wMAjkc46msyfw9o89idGX4XW0mnQSyyRiPWUVXaQYkbAIOSAAc9sCuz6rSj0OZ4icty7b/D7QLvTm1a08aQTWYQSNNFbB1ClQw6OcHDA468j1qPTPBnw/1BoRF46ju3uZGhijidFdnU4ZQhJOQe2O49aNPQaTp8tnpvw0s7e3mB3N/a8eRlFQlW5K/KijKkY2j0p9lYT2FxHd2fwwsYbiIEJL/aa7hltxOduck8k/X1o9hST2BVag2Dw18K5beG9g8VWs0FwzJG8s64ZlOCMgrjB457kDvW7/wqfQ1OYb14vZYIn/8ARitXProrLEsEXwo0NIY/uRi7QKpzkkAJgE98de+a3m8Q+OyML4X09c9zqX/2FL2NLsV7Wp1Yr/CfTnYt/wAJRq8Of+fYW8P/AKBEKrz/AAX0C7G298W+KZ1H8L3yEH80quvjDx1LqcmkR+HtMW4iiEzbr1iuwnA5C9atf2z8STkf2VoS/wC9cyn/ANlpeypvWwvaTXU5vVPhR8L9D1G3068g8S3TXLxq8yTZjiMj7ELsAMZbjj8cCo3+HvwotvG8fgpvDGtyyva/af7QLq1qDnAi3bt289fu4xjnnFbtzJ45vJ0urnQvC0k0eCkkhldlwcgg44weRWTqNl4otNUk8fzeG/BravZWjRfbhBKbkQgElVckdie/eq9lR/lHz1H1PKdY0LQ9P1O6tYr+0aOCeSMCKBywAYgZyqjPHrXNXml6dJdLMsSyNECqSMuGwcZ4ycdBXmvxq/aUsPhj4zuvD174TuNSvHjW8eZLoQxkyknGCrEV5jrX7aF1ZvFHZ/DuL97AkwaTUicbu2BEM1yrC1ZfCtzR4mEdGz6ftlWOVeBgH/Gsv4ifEDXvBej2994R1WWx1W3v7bNxH1VSJGAB+sXI6EEjoTWN8IfGl38RvA+meL72wis5b9pcwxOWVQkrIME88hc/jWR8T4jH4cBOTvvrUkn/AHLmojTcZO/QmtK8Lo+3P+F3Xv8A0A7f/vs0V5Z5i+o/OivSuzj5i4NRht7lVM15HIsg/dygADpx06dqrXGrxT31nNNayRT3EhAZlb5sI44J49DXLWXxFhBDT63CGn/doXHzv7e/J7e3WoLfxnJe6nY6ebaAQS3JaOZeWbAYEHniuSgrVVy3OTnWiOpvZ7hrCx1GC+VFEMSSDdjb8vr0ro9Ov2fwdBI8u5jeIC27dn94O9eZaP4xhisMnSbW/jijRWiknKJ8o69HGR+HerFj8UYNWntPDlp4djsI5bqJtyXW9U/eKfu7B1r1Kc/aRsOM43bPXb7ULj/hGNIaB2VhHESVfB2+Ua57TdRlmhuPPupJW2Hl2LY/ejjJrl/DXxbtbzT4bKfRYxHbRLEpe4Lhwo25xs46HitOz8QjVLy5VdNhsxDAvyxnhgzKQTwKtX5SnJSndM86+N9xH/aFi5JH7gjOP9sV6T8O9egsPAGlpIk0kU9pcW5MSI+0mVjkhjgjjp715v8AFaO4vtX05LaKN3S3dyrdCA44PrXT+D766h8I6ZYyKqPC8+Ex33N3ry4w/wBobO+rK1CJ31hdWou7XybaQEEiIpptsqqvVh1JGc80Np2lyStbQ2b4hQY26bZkAMWHp7VlxapJDPBuIUorYx7kA1p6Jf8Anz3LuQW2Ln/vuSu2Kuk2ccZt7nNfEHxvoHwx0f8A4S3X9J1O+t47qNWht9OsdxLHI6hTgY6hsiuOk/bp8ArpE2rr4N8VGOCVYmQx24Yk9/8AXYrqvjP4JvviR4Pfw5p93b20rXMc2+bO3C544BOea8KX9lHXjod1o1z4o0+M3E6zCSOB3xgdOcV1Rp0fZpyet/wMp1K6qWgtD6X8I/HTSfF3gy08Z6f4f1WK1u4WlWKbyhIArFSDhyOo9aY3xy09ef8AhHdT/Fox/wCzVxngXwc3grwBZeCZ9RS5a0heI3Cx7A252bO3Jx971psvhaAjnV1X/tl/9lXDNrmdjujeyvuddB4h8Q+PINdu/BciaNqktpHa20t42QhDqWYlQ2CVLAEA4ODjtRqPiLxjpV5HZan4iWS5WzgWbyLdRG1wIx5jJk7gC25gD2GKyNA1ay8AaTq2sTTm8htofOYR7VJ5UbeWwOcdT3roNT+IWl294ls+nTSiUIfOCrswy7hk/T+lOmvtDm9LFq28Wa5e25uLeylI3bV33IUNg8kHHtVp9a1K70nVYL23eGP7HOFLTB9/ynsOnb86py+KdH2ESPbqrZ5Fwq9PcfSnX+o6f/wjd5fxzhIvss25mmymACCSScdv51cloyY7n5sftjgN8ZrwYB22Fqv/AI6T/WvGPE8SrPY4GP8AQIP/AEGvuv4j/CT4J/EHxLL4n8U+Itt7cxIjJHqsUaFUG0EDGe3rXM3vwI/ZvmaNrzWbeUxRLEC+tgEKowPusKUMVSgo+RM8NUlJtHQ/svwqvwX8OfL/AA3B/wDJiSt7xd4T1jxlpkOnaLFGxF3bvLJJIFRECzAk9zjcOACeareHfEfwu+H+iWXhbw5rlk9tbiQWtrBeCeVuWdgCWJPUnk12HhX4gaN4gu/7L060uIWSJpvnRVXAIHGCeeRXC6kHO19zqdKTp+9sj2z/AIV1c/8AQSh/79tRXbbx6Ciuyxjyo+ELnyrbxHpdrBu5e33EnA5CHOMe9dr4Xn/4kXg+bzDO7X0gaUHqPnwfftWhLpPhubUba5a8Uyys9sknlnAeJwpiPzDBznA77TVufw/ZaLZabFaOFisbpDDGqFQCzYP8R9TVQxFKTtE4OV3uzzPVdejht7y5j05rt7SWCMRRHaz7g+7OAew/xq18ObxLvVYr1dMeylF7bRyQu+5l/fAA9B1HtV/x1qnhL4deAZfFcmknUL+9ggEVhHcNHLeSttUBfm6Dfk7RwOazfg7rOk+KPDL+J18BS+G9RTULJJle/acP+9jYH5juB2sOGHfvRCrSTS6mjpycXKK0ua3gsTJYGRrSZCZbgsGQ5A8xyD+I5Hsa9P0u5WPVLhUG0GwtiefZa8y8ceLdF+HvhGyvNJ0i1vdZu4I5IrSe7mRW3KCzHaGwCeOeOfSprL4padLq3kXFn/Zl7LYRp9mklDs0pdBGo57AjOcY59Kp4yjG1NvVh7GokqjWhueP9UhtNds57iRVQWkoJJ/21rO8O+MdP1O0uE03VY7w2drcNLFDPloiWcrkdsjpXgnxI+P3hT4j3VxovhDULhr7TYpMTyRBFmGR80fUnHoQOo963vgBHq00c+r3er2f9i3VpJK9uUUXsg+ZfMm6MvQqoGVxjODXJztV7dDoqSfIoo+gPBGs3WqWoluXlLtJjbI+4qPl4zxWJ4n+PCeAPEJ064t4ZLeS9WKViCCkOSSSd2A25+wPAyAa8hude1P4b+E7qLSvFerT3niXWGgtmkuElfToyq4KFlwpbOOQVHHcHPd3K/CbxTNofivxbrVu09vaR3kc88ogAI8zdK+MKCHGME43cY7VrU5qlNexdjCdGVN2b2ZheBfH+p65FqtkbPWYD5Kuga+eTJZjkq+B68gDgc1k6WPEkPiq81ZDqqwrLLL9lW7eYTKTJ8m0qNpBX1P3gK4/RvDeq6Br+g+K9F1TR7XT3QpeWjwy7LyB49ylWLEkjcpyu1fU44PQ+F7RPEHiLWLtjZ/Yr24umM9lertzIWzkbjgjeccAjjNZKcaml9tzvV4Qcktzkv2g/FevX0eg6pYTaroTTxOJLZbl0cYkKjdjHpn8a860u98QXi/vvEmptj+9dyHP61f+PXxM8M+IljtdDvFMuiQGF4/LYBnU9FPO7oMtwD1HFcH4G1qzsYIV1HW7fzbhZJk2wzljyThvkOWI6Y4xgUcujl0Fvp1PvT9ke5kj8NziaZ5XAkBd2LMf3nqa9nv9Hsr3UTqE00rM3WNiGjPGOVORXzL+zrca+nw71NvAUlq2oyvJJbNe/JFl7kmQnaCOhfb/AMBzjkj1+78Y6/aXi2l5d6fFIsEbSxoAfn2ZcKzSKSNx4LKOP02w2sbIitpa53FxptgEZ2gt2xg/vEUDg8c47VyPxhvBH8HPGFjH5SxPoN6oMUg+XMTdAAPXtTJfHiwWEmp3nmW9nEu955mgWNUzgktuxivJvFP7Rfwv+Ing7xj4V8PeKIJdSTRbxlheBozKoiO4xkgBsDqAScDPQZraUdDFSPBtZPhxoPCMWuWzyi3sQ0+2Ms8sRdcLvBBGNj/99VyEti0Mtw0Esf2TcxiaSJg+zPGRjH61u6x4M8XeJZvDur+HtTsYbO1s0t7mKeR1ZiJC5wFRh0JHX1rdl8FPNoMsOq39s16AWSONWeKdMkBDlQVOMcnI6/h4rh717/1c9iM7RStsUvCqWE3iTS5rO3VI0W6K4XHJSQ/XgED8K98+FciR+J5G3YzaSAfXcn+FfNV7I3hG+LTWMNvBcG4aFANkcUboVBYRZ2jOeh/EZrY/Z38dMPHe7U9RsrS2KSwQm5Ls07tyFhyeGPHLeuMEmtOR+2i+xxVMVZOFtWfq99o9xRXM/wBty+v6iivV5TC58G2fxEu7z4qWkFysyaadSMzWzA5SVYioP/ffmP8AQDPNeyw+I73UvC9nrur2T6fHNNHMfOcBUj875GLHGAVwfxr5/l+H3ijSvip/aFhaJ/YEN/FcRzy3CmXy9xMgC5JzhmHPU4NeufHA6Nqvw7mstZid9JmkhM8MMvlSFVIYYYA4Hy8jH5V52EwiotzqPYwcXN2ij40+Onxe8Uav8QoZoL6KO28Pj7Jpoj+aMxgYJb+9u/l0rpvgJ+0H4w0G9Om+JILjU9A1aZWt5I4dixXkBSVkWQjn92FDAkkZQ+uehl8Hfs+axaNdQ2+pWCOwUypqjYBA6Yk257V3Wm23wW1Tw5D4XtdY1QQwRpEgiuRJwpHUqWI5APB/rXqVp0tGo+l1Y0pU5OPK3p5GN4p8TXHxElhuGjjigs7YQpEbnG5EUArkgcnHTH51d0E6zZeIrHVjbQG5jSSJJGkaRVj2HlxgYwC3IP58Vd0vxT8HvhcbmbSUvrpj8kztDujBU9C0vHavNfHP7QGjXrrpHhnRI9ItL5/OkKhgsg6GQlF+ZRhs7c9OOlcqUKsdVeXQ3mnFq/wruXrb4b/D7Rb7+09D0Oe+u/MkLXMs8hzuJyPLUhcDOBwTwMk9a+hPAfgOTQ9CsNSTxfJcRC2liMdxAoiWORmfBG7hlYnvjrwM18va744/4Qrw3FrIuhfT3hAsk2lYpFIyGwQCoAxkEA5PvxwGnfEzxn448TW8OozvJAoZ2tIFLJ5ccZYhVcnHCnOMd6uNKTTqNbGcnByUT698ZN8LFhMOt+KtKC28q3DJZ3RRty5+95SsQMHn2rm4fi58PLGHVPEvg3TYJ30q1CXt1LdXBjETH5cAxsSSwH3QDzk+tfNnxI1BNa1svofh3UtPilXYLR4SojUMThUCgAkFc9fu9ea9J+A9to1hpmoaD4mRFm1/zbWeylbbKbUQkliOq9X64PANZKGi5WU615PmWh0Pjg+JPF/hM+J9d1yKEarAhsIomZfItX2necnqVHHf58nuBxvwz+C2o39nqUNr4+1XT7PbG199hlZUvFO4pHxwCCMlmzxnA5r0X4qXKq8ekRKI7W0C21uifLHAoXAAHRV4AxVf4SeN9HttNvPBMsQIRluFYADaSoG0nvnHH0pSpOEnyPQ6IVozilNXf6HOXPhyy0H+1NZttAtdOWzSWaBpdkjGdmWNHHGf4uCMduK8l8G/E2y0HWZbfWNOWSO4vizX5GZkVsZ3HuNwyQMdTXufjfUxpc9q8NxaXUNx5tvPavnc646MCMY6ZOepBHtx8H7P/hzxNo19rNrO2mS3RjSC3ZvOVSXBLKG+bpyck8E4xToypqi6dTe97lVlUlV9pT00sdB4K+NHi3wF4n17TbnTRqfhu/hURXAmWFLTcAwwV+8GDjvxkHPJB7vwn+1hpVnaDTPFdgt7NbsLWKa0ikkMipwGbCtzjbzx0PbgcJ4E0q8tNUbSL+Ky8qCB7WC3SMRx7l/2RkfNhifUk9etbE1xY+DvFy32peHoX0e/tHimtIbMPGjqQdwBAUfw9snJ9KK1/aX2dvkznhSUrNO6vY5L9pv40eNtVuhplpcvZeHNRgWS3szCB5u1hv8AN3LlyHGR2xiuV+BngWPx3Odf0KwtY9W00XMVyZ3YWpWa3kjBdRnAy+cAckEYx09g8VfD7RPjNoR1HUp7TS0svngnsJVlCZzkSRkA5ODxkdj2rwXw/rerfAz4hXllZ3slxp8jC3uF6LcQn5lbHQMM5HoQwz1pRbqQTlozaUY05NJXR6foU3jXw14yl8M+MngtINNsS0ZgYeRdlyNsqnHThxjtggjNdNPrNi4IF7btwMYlH+NL4p8Zaa/he1128kidd6qGY5yjjPHrzj865221zTL+2S4hsVMUq5VgoGRXHXTUua2h00LOPLfUz/Hek/2w9jqVlfRthXt5EyCoXDAkksAfvDjOfSuB8E+GvFcXi9H0j+zY7ixYGV7mzNxGqAAZJ8s4wDkZII/vA4r0DUNSZhHp9tE0MVzujMifeTcQNw6dOal+HOmabo3icWmqW8Woyys8kN2xIkiZVDAj/vj1+ua6aP7xxaPPxFHlk/PU/RTfL/tfmKK0POsvR/yorvsZHybq8+u3GqmOz02Nk3f6x5sLj6AGu40qD4f6rZat4flsNF1jxMn2KV7DVrxtsenuZBcTIr3ECuVKxDb5ilVctwMEc1NepBmZlcgDPyRlz09ADXzBpC+LfEnxI8Wavr8MWlWyCa3ml1GURKkk5/cRg45JjhwMA/LFknC5pSopQk2EZ3lFI+j9K/ZY/Zv8e6BY+KNO+IGoWMN54kv9MlFhq8LW4WG7uYgirKhKFoYY51Zmc7ZMbcESVy3w4/ZM+BfifSL34sxeLNVtLPTdPsL6109tUt3mt7g2zTSm5cQgTAS7YwqiAhQclmIDR2XgbVtI+Huj6ZYaZd3s0lxc3cstvbFg7mKWMlSgwwVmji3DPQE8mqvhDwzraR3eoafotza6Xq1n5EdlHC7i7kWP5pFIAHGGbIBPU5Aq5KbVm2KKinzJHqviD4NfC3xT8PviB4a0XxHdxyaHf37WbS6xbvLd3cNg8y/u1hA8uTIjUbwchiCxBUfI37Q/g7RfDXxf8V2Xgq6sLbRrbXNRtbK1jUtDZWkEjCLD5JZSoyD3yT7nD8d+E/GOieJdZ1abS9Rt1sL1lnvIo5BFBIzBlVpAMK22WMEZBBZR3FdAui6z4s8L2F1qPhrUYLe+lFtDcW9i5N1I6nhML8+4pxj/AGsdDiKfNRikVUiqrueW6p4a8a6zdyWSwjUf7PkMBFvcK6RNnBAGeMlfTnFeifCL4a6t4V8Qw694niSASwPFbwqwZmLMiPuwfl+R3/WtvSfDt74WS/lh8M6tZ263KR3E1zbSIvnCNSF3N/FtcNjrhge9egal4a8RRLFHDbpqE1pcbZo7LdK8DKBvDjGQAr53fd4PPBrOriJ6xW3oa0sMlZvc3Nd8Rafe6la3TQ5MEZUED1liY/pGfzrxTwh9p/4WdrVigM87QTxx4cI2HcfOGPAwvHUfer1ePwt4lv8A7TLJplzZRW1i9+7T28igwqVGQQpJ5ZR6DOTgc15VqngvxVceKJfHOkwZ0vTbvT4dTYSAMI7h2RTjqRujwcdCy561jh5e++VW/wCAPE07xi3rZnsS+E77V1SXxHdWSs8KpIfIa7+cKATgDueeP/r1jX/w61K3me40fX9DdnUIqLpTRSnHTLKePxrl/GcPjj4fa/qWmXPh/UpYrKS2WWa18x0hkmjiZY2dQVDfvUGPVgO4q3Z+IviJaWkdxeaJ4htBNuWFJ7MyvI6vFH5YQDeHLzxKAVGS+K0lCtON+TcIyp052UrWMlvhT46lvt2ra7FNCsjSja5Yjdgsqg9BxXrtjJPDZxw3MMUaIqjCnaMAY556fXiuBs/iB4pc3qz6FdmTTYUuL4XGnTQtbxOrMrPlQFBVGOTxhWPY1t3fi/UtPt7f/hIfCV3bwX0ZaF5UKpMnQlQw+YVyShNO8lb5HTzJrR3M7xva6tpmsW194fKMXZZpZoiZSCDkYONmCOOCcYwBzXW+F73xPrdi0moRy6VqaKrCO4ETwTqRkFduSM/UEehrmU8U+B5ohA9g1qp4x5Owf+OmsD4ifEzRfCfhdrPwzNJJfXiPFB5eS0OQfn+b0zxzWnPKvJRkr227mcYqjBu9n6aHo/ifxTbW9iulxvG1w/8ArjHwNw4/EA15B4w8H6f4ztJ5I5VjuwFCS9sqWx/6Ea4X4c6/4j1TUPs/ibU57iGZdkfm8HcPVhyTj19K9RubpNPsn89SqRrzKo6AdyK0nSlCdmZQqRkro8X19/FV5Y2Xgq9kWGTTQfNLPhGUnMYGM545z7jNe06J4bbT9GsrQOGWO3jAx0+6Oa8QuNYl8UeLkjhJEM06w5HVl3Yyfzr6Lt7qDyEijPCjbj0GKyxusYwKwUnzymZ1xpUUmxztLL3U4FVYvD9tLdC7Se4jdVYfLKe4weevetL7VGWKORyOAR3pn2gId4A2k8iuOm3DRM7p2krs/QL7K3/PRvzopftAor0eZnDofK7X3zH5uKrtfWNta3VtdaTaXttcyRzPHKXX95GGCNuQg9JHBHcHsQCPWvH/AOyn8UvDGvXFt4b0yLWtKd2a0uVvIYn8vPCyLIykMB1xkH9K5K5/Z2+NkilR4Lznt/aVp/8AHa9N8sluefHmjI4e18e3WmxRww6XZtDFCYkiUMiqftDzqy4OVwzsMDt6EA1i3PxGv9O8PXFinh20mjEP72CDej3JWF4+zcM2/cW5+bk8cV3U/wCzT8cnyE8E8f8AYSs//jtVD+zB8cwD/wAUNuJ/6idn/wDHa5ZSmnozrjZrU+aPEmsfEjxPaXo1Hwdpkd5exPbJcQzyYt7d3R2jCtId3zJwzBiAzdSFK9N4f8Q3vhzSLOxi0W3e5/s+PT9QlleQ+fEFmV41UPhQVncb12twvTBJ9mk/Zc+PBzjwJgdsapZ8/wDkWqcv7Knx7lxu8B4HoNUsv/j1c1SrXnob040ou7PJtf8AEt3r9jZ6Y9hDZ22nSM1skRZiFMFvCFJY8/LbIc8cs3QYA1brx14m1qe9fULotDexSRLbb28uAOyMxQZ4J8pB7gD0Fd+f2TvjwSf+KC/8qllz/wCRqlh/ZS+O0a4PgHv21Szz/wCjq5+Sq3qb+0ppHL3Xje81CC5tpNJskjv3uJ7pY2k/eTzy28kr5LHbn7NGAo6Zb2wzwl42u/DNzqs9lpljNbT3ELfZ7lWkiIhjmAUgnLANcMeSTmNT257eP9lz47qMDwJgf9hSz5/8i1Tt/wBlv4/x6esUngA+aUJcf2rZffbk/wDLb1JraNKSfN1MXVTVjhE+JctxqM73vhzSLq5kubW3kupYmaV447SFQGOeebZG54Bd+OQRw/iH4i6r4IvrC7sNKsZ3WdLgyvv+Z1urS4ZSA3d7NOeuHbvgj1gfsl/tDi6nlHw94a5jcf8AE2semzBP+uqpr37Gf7QfiGD7JJ4DSLyz5qOdTsj82CMcTd8/pXZh5Si7yZy4hcyaieKeBfHms2fhI6Bf6PB9kFqIrSbfJDLuR7lhIrAjP/H7ICOPuL0+YHK8Y+Oor2Kz0yw0T+z7Gwt1tLe1gkcJFGo4C7mOMkszd2Z2Y5JJPrsf7G37UGi26WFr8N/t0KkkFta09QBnsDPx1qO4/Yt/aXuhub4YkE/wnWdOP/ternUlJ2exMIcqPG/C+sSNqFlaLe3DI0mGjdy2evFQ/E+ZodXt5ERSogAII6cnmvadI/Yo/aXtNXtrmX4aKiRyAkjWLD0/671J40/Ys/aW1rUYPs3w23xlFRm/tjTxt5956ypq1ZS8iqjbpcqPm6HVr6zAjuLcxsjZCklDkfXFXdW+IXiHUtJbRrqYmMsAZGH7wr/dJHUfr7171c/sXftQzajOf+FYgwO5wG1nTiMfQz0jfsG/tBXTb5vhYsZPXZrViP5T1o6zl8SM1QcfhkfP/gZnh1mK8RMm3IkxjOfava49WIXKyADPY9a6Kx/Yf/aH0syRWfw2Ee7Y4Y6xYsfcZM/+c1tr+yB+0eAc/D7PPH/E2sen/f6uKvB1Zc1jqw/7mPKzivtySDfuyc9c1Kt6DkE9f0ruLb9kr9o+MESfD44/7C9j/wDHq7r4X/sOfG3xl4ktrLxTpEHh3RUlVr69kvredxFnLLEkTsS5HAzhR1J7VgqEr6I6HVVtz6e3e1FfRH/CtvBf/QEj/wC+zRXV7NnPzo//2Q=='

type Props = {
  conversation: ConversationSummary
  currentUser: Profile
  onBackToChat: () => void
  onNavigate: (section: NavigationSection) => void
  onContactCreator: (creatorId: string) => Promise<void>
  onDeleted: (roomId: string) => void
}

function formatCreationDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function RoomInfoPage({
  conversation,
  currentUser,
  onBackToChat,
  onNavigate,
  onContactCreator,
  onDeleted,
}: Props) {
  const [details, setDetails] = useState<RoomDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contacting, setContacting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copiedValue, setCopiedValue] = useState<'code' | 'id' | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const nextDetails = await getRoomDetails(conversation.id)
        if (!active) return
        setDetails(nextDetails)
      } catch (caught) {
        if (!active) return
        setError(caught instanceof Error ? caught.message : 'No fue posible cargar la información de la sala.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [conversation.id])

  const contactCreator = async () => {
    if (!details || details.creator_id === currentUser.id || contacting) return
    setContacting(true)
    setError('')
    try {
      await onContactCreator(details.creator_id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible abrir el contacto.')
      setContacting(false)
    }
  }

  const copyValue = async (value: string, kind: 'code' | 'id') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const area = document.createElement('textarea')
        area.value = value
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
      }
      setCopiedValue(kind)
      window.setTimeout(() => setCopiedValue(null), 1800)
    } catch {
      setError('No fue posible copiar el dato. Puedes seleccionarlo manualmente.')
    }
  }

  const removeRoom = async () => {
    if (!details || details.creator_id !== currentUser.id || deleting) return

    const confirmed = window.confirm(
      `¿Eliminar definitivamente la sala “${details.title}”?\n\nSe borrarán sus mensajes, integrantes y código de acceso. Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')
    try {
      await deleteGroupRoom(details.id, currentUser.id)
      onDeleted(details.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible eliminar la sala.')
      setDeleting(false)
    }
  }

  return (
    <section className="section-page-shell">
      <div className="chat-aula-page room-info-page">
        <header className="room-info-header">
          <button className="icon-button" type="button" onClick={onBackToChat} aria-label="Volver al chat"><ArrowLeft size={20} /></button>
          <strong>Información de la sala</strong>
          <Avatar profile={currentUser} size="sm" />
        </header>

        <div className="room-info-page__body">
          {loading ? <p className="muted-copy">Cargando información…</p> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}

          {details ? (
            <>
              <article className="room-info-hero">
                <img src={classroomRoomImage} alt="Aula de estudio" />
                <div className="room-info-hero__overlay">
                  <strong>{details.title}</strong>
                  <small>{details.member_count} {details.member_count === 1 ? 'integrante' : 'integrantes'}</small>
                  <span>Creado por {details.creator_name}</span>
                </div>
              </article>

              <article className="room-info-card room-info-card--description">
                <div className="room-info-card__label"><Info size={15} /> Descripción</div>
                <p>{details.description || 'Sala de estudio creada para compartir dudas, anuncios importantes y coordinar actividades académicas.'}</p>
              </article>

              <article className="room-info-card room-info-card--activity">
                <div className="room-info-card__label"><MessageSquareText size={15} /> Actividad</div>
                <strong className="room-activity-number">{details.message_count}</strong>
                <p>Mensajes totales</p>
                <div className="room-popularity-line" />
                <div className="room-popularity-label"><span>Popularidad</span><b>{details.message_count > 100 ? 'Alta' : details.message_count > 25 ? 'Media' : 'Nueva'}</b></div>
              </article>

              <article className="room-info-card room-info-card--date">
                <div className="room-info-card__label"><CalendarDays size={15} /> Fecha de creación</div>
                <p>{formatCreationDate(details.created_at)}</p>
                <small>Ciclo Lectivo 2026</small>
              </article>

              {details.visibility === 'private' ? (
                <article className="room-access-card">
                  <div className="room-info-card__label"><KeyRound size={15} /> Acceso a la sala privada</div>
                  <p>Comparte el código para que otros usuarios puedan unirse desde “Unirse a sala”.</p>

                  <div className="room-access-row">
                    <div>
                      <small>Código para unirse</small>
                      <strong>{details.join_code ?? 'No disponible'}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => details.join_code && void copyValue(details.join_code, 'code')}
                      disabled={!details.join_code}
                    >
                      <Copy size={15} /> {copiedValue === 'code' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>

                  <div className="room-access-row room-access-row--secondary">
                    <div>
                      <small>ID interno de la sala</small>
                      <code>{details.id}</code>
                    </div>
<button
  className={`room-access-copy-button room-access-copy-button--id${copiedValue === 'id' ? ' is-copied' : ''}`}
  type="button"
  onClick={() => void copyValue(details.id, 'id')}
  aria-label="Copiar ID interno de la sala"
>
  <span className="room-access-copy-button__icon" aria-hidden="true">
    <Copy size={16} />
  </span>

  <span className="room-access-copy-button__label">
    {copiedValue === 'id' ? 'ID copiado' : 'Copiar ID'}
  </span>
</button>
                  </div>
                </article>
              ) : null}

              <article className="room-admin-card">
                <div className="room-admin-identity">
                  <span className="room-admin-badge"><GraduationCap size={20} /></span>
                  <div>
                    <strong>{details.creator_name}</strong>
                    <small>Administrador del Aula</small>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void contactCreator()}
                  disabled={details.creator_id === currentUser.id || contacting}
                >
                  <Mail size={14} /> {details.creator_id === currentUser.id ? 'Eres tú' : contacting ? 'Abriendo…' : 'Contactar'}
                </button>
              </article>

              {details.creator_id === currentUser.id ? (

                <button
  className={`delete-room-button${deleting ? ' is-loading' : ''}`}
  type="button"
  onClick={() => void removeRoom()}
  disabled={deleting}
  aria-label="Eliminar sala definitivamente"
>
  <span className="delete-room-button__icon" aria-hidden="true">
    <Trash2 size={18} />
  </span>

  <span className="delete-room-button__content">
    <strong>{deleting ? 'Eliminando sala…' : 'Eliminar sala'}</strong>
    <small>
      {deleting
        ? 'Espera un momento'
        : 'Se borrarán mensajes, integrantes y accesos'}
    </small>
  </span>
</button>


                
              ) : null}

              <button className="back-to-chat-button" type="button" onClick={onBackToChat}>
                <MessageSquareText size={16} /> Volver al chat
              </button>
            </>
          ) : null}
        </div>

        <BottomNavigation active="chats" onNavigate={onNavigate} />
      </div>
    </section>
  )
}