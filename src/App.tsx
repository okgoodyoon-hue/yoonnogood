/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Utensils, 
  Share2, 
  ThumbsUp, 
  MapPin, 
  ExternalLink, 
  Loader2, 
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Sparkles,
  Info,
  Star,
  Copy,
  Check,
  User,
  LogOut,
  LogIn,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove,
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Markdown from 'react-markdown';
import { db, auth, signIn, signOut } from './firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface ShareItem {
  id: string;
  url: string;
  description: string;
  likes: number;
  authorId: string;
  authorName: string;
  createdAt: any;
  likedBy: string[];
}

// --- Components ---

const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode; className?: string; title: string; icon: any }) => (
  <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full", className)}>
    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <h2 className="font-display font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>
    </div>
    <div className="flex-1 p-6 overflow-y-auto">
      {children}
    </div>
  </div>
);

const ShareForm = ({ collectionName, placeholder }: { collectionName: string; placeholder: string }) => {
  const [user] = useAuthState(auth);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return signIn();
    if (!url || !description) return;

    setLoading(true);
    try {
      await addDoc(collection(db, collectionName), {
        url,
        description: description.slice(0, 100),
        likes: 0,
        likedBy: [],
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
      });
      setUrl('');
      setDescription('');
    } catch (err) {
      console.error("Error sharing:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-6">
      <input
        type="url"
        required
        placeholder="URL (쇼핑몰, 카페, SNS 등)"
        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="relative">
        <textarea
          required
          maxLength={100}
          placeholder={placeholder}
          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm resize-none h-20"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">
          {description.length}/100
        </span>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
        공유하기
      </button>
    </form>
  );
};

const ShareList = ({ collectionName }: { collectionName: string }) => {
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<ShareItem[]>([]);

  useEffect(() => {
    // Get items from the last 7 days, ordered by likes
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const q = query(
      collection(db, collectionName),
      where('createdAt', '>=', Timestamp.fromDate(oneWeekAgo)),
      orderBy('createdAt', 'desc'), // Secondary sort
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShareItem));
      // Sort by likes manually since Firestore composite index might not be ready
      const sorted = docs.sort((a, b) => b.likes - a.likes).slice(0, 10);
      setItems(sorted);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const handleLike = async (item: ShareItem) => {
    if (!user) return signIn();
    const itemRef = doc(db, collectionName, item.id);
    const isLiked = item.likedBy?.includes(user.uid);

    try {
      await updateDoc(itemRef, {
        likes: isLiked ? item.likes - 1 : item.likes + 1,
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error("Error liking:", err);
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    #{index + 1}
                  </span>
                  <span className="text-xs text-slate-500 truncate">{item.authorName}</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2 mb-2 leading-relaxed">
                  {item.description}
                </p>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
                >
                  링크 보기 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <button
                onClick={() => handleLike(item)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                  item.likedBy?.includes(user?.uid || '') 
                    ? "bg-indigo-100 text-indigo-600" 
                    : "bg-white text-slate-400 hover:text-indigo-600 border border-slate-100"
                )}
              >
                <ThumbsUp className={cn("w-4 h-4", item.likedBy?.includes(user?.uid || '') && "fill-current")} />
                <span className="text-[10px] font-bold">{item.likes}</span>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">아직 공유된 내용이 없습니다.</p>
        </div>
      )}
    </div>
  );
};

const AIResultDisplay = ({ content, type }: { content: string; type: 'price' | 'restaurant' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      {/* Decorative Background Glow */}
      <div className={cn(
        "absolute -inset-4 rounded-[3rem] blur-3xl opacity-10 transition-opacity duration-1000 group-hover:opacity-20",
        type === 'price' ? "bg-indigo-500" : "bg-emerald-500"
      )} />

      <div className="relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50 overflow-hidden">
        {/* Header Section */}
        <div className={cn(
          "px-8 py-6 border-b border-slate-100 flex items-center justify-between",
          type === 'price' ? "bg-indigo-50/30" : "bg-emerald-50/30"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
              type === 'price' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
            )}>
              {type === 'price' ? <ShoppingBag className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {type === 'price' ? "AI 최저가 정밀 분석" : "AI 맛집 프리미엄 큐레이션"}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Real-time AI Intelligence Report
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full border border-white/50 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Analysis</span>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="p-6 sm:p-8">
          <div className="prose prose-slate max-w-none 
            prose-headings:font-display prose-headings:tracking-tight prose-headings:text-slate-900
            prose-h1:text-3xl prose-h1:mb-6 prose-h1:font-black prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-slate-900 prose-h1:to-slate-600
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:font-bold prose-h2:flex prose-h2:items-center prose-h2:gap-3
            prose-p:text-slate-600 prose-p:leading-[1.8] prose-p:text-lg prose-p:mb-6
            prose-strong:text-slate-900 prose-strong:font-black
            prose-ul:list-none prose-ul:pl-0 prose-ul:space-y-3 prose-ul:my-8
            prose-li:relative prose-li:pl-10 prose-li:text-slate-600 prose-li:text-lg prose-li:leading-relaxed
            prose-li:before:content-[''] prose-li:before:absolute prose-li:before:left-0 prose-li:before:top-[0.7em] prose-li:before:w-3 prose-li:before:h-3 prose-li:before:rounded-full prose-li:before:border-2 prose-li:before:border-white prose-li:before:shadow-md
            prose-table:w-full prose-table:border-collapse prose-table:my-8 prose-table:text-sm prose-table:rounded-[2rem] prose-table:overflow-hidden prose-table:border-none
            prose-th:bg-slate-900 prose-th:p-4 prose-th:text-left prose-th:font-bold prose-th:text-white prose-th:uppercase prose-th:tracking-[0.2em] prose-th:text-[10px]
            prose-td:p-4 prose-td:border-b prose-td:border-slate-50 prose-td:text-slate-600 prose-td:bg-white/40
            prose-tr:last:prose-td:border-none
            prose-tr:hover:prose-td:bg-indigo-50/40 prose-tr:transition-all prose-tr:duration-300
            prose-tbody:prose-tr:first:font-bold
            prose-blockquote:border-l-0 prose-blockquote:bg-slate-50 prose-blockquote:py-6 prose-blockquote:px-8 prose-blockquote:rounded-[2rem] prose-blockquote:text-slate-700 prose-blockquote:font-medium prose-blockquote:my-8 prose-blockquote:relative prose-blockquote:shadow-inner
            prose-a:text-indigo-600 prose-a:font-black prose-a:no-underline hover:prose-a:underline prose-a:decoration-indigo-200 prose-a:underline-offset-4
          ">
            <Markdown 
              components={{
                h1: ({node, ...props}) => (
                  <h1 className="flex items-center gap-4" {...props}>
                    {type === 'price' && (
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                    {props.children}
                  </h1>
                ),
                h2: ({node, ...props}) => {
                  const text = props.children?.toString() || '';
                  let Icon = null;
                  if (text.includes('최저가') || text.includes('가격')) Icon = ShoppingBag;
                  else if (text.includes('맛집') || text.includes('메뉴') || text.includes('분석')) Icon = Utensils;
                  else if (text.includes('리뷰') || text.includes('후기')) Icon = MessageSquare;
                  else if (text.includes('대안') || text.includes('추천')) Icon = Sparkles;
                  else if (text.includes('적기') || text.includes('판단')) Icon = TrendingDown;
                  else if (text.includes('정보') || text.includes('스펙')) Icon = Info;
                  else if (text.includes('위치') || text.includes('지도')) Icon = MapPin;
                  else if (text.includes('요약') || text.includes('비교')) Icon = TrendingUp;
                  else if (text.includes('가이드')) Icon = Info;

                  return (
                    <h2 className={cn(
                      "border-l-4 pl-6 text-2xl font-black mt-16 mb-8 flex items-center gap-4",
                      type === 'price' ? "border-indigo-500 text-indigo-950" : "border-emerald-500 text-emerald-950"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        type === 'price' ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500"
                      )}>
                        {Icon ? <Icon className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      {props.children}
                    </h2>
                  );
                },
                a: ({node, ...props}) => {
                  const isMapLink = props.href?.includes('google.com/maps') || props.children?.toString().includes('지도');
                  const isShoppingLink = props.href?.includes('shopping') || props.href?.includes('mall') || props.children?.toString().includes('구매') || props.children?.toString().includes('가기');
                  
                  return (
                    <a 
                      {...props} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all my-1",
                        isMapLink 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 hover:shadow-md" 
                          : isShoppingLink
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5"
                          : "text-indigo-600 hover:underline"
                      )}
                    >
                      {isMapLink && <MapPin className="w-4 h-4" />}
                      {isShoppingLink && <ShoppingBag className="w-4 h-4" />}
                      {props.children}
                      {!isMapLink && !isShoppingLink && <ExternalLink className="w-3 h-3" />}
                    </a>
                  );
                },
                blockquote: ({node, ...props}) => (
                  <blockquote className="relative" {...props}>
                    <div className="absolute -top-4 left-6 text-6xl text-indigo-200 font-serif opacity-50 pointer-events-none">“</div>
                    {props.children}
                  </blockquote>
                ),
                code: ({node, inline, className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const content = String(children).replace(/\n$/, '');
                  
                  if (!inline && match && match[1] === 'json') {
                    try {
                      const data = JSON.parse(content);
                      
                      // Restaurant Summary Card Grid
                      if (Array.isArray(data) && data.length > 0 && data[0].name) {
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
                            {data.map((item: any, idx: number) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group/card relative bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
                              >
                                <div className={cn(
                                  "absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 group-hover/card:opacity-20 transition-opacity",
                                  type === 'price' ? "bg-indigo-500" : "bg-emerald-500"
                                )} />
                                
                                <div className="relative">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className={cn(
                                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                                      type === 'price' ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500"
                                    )}>
                                      <Utensils className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-black border border-amber-100">
                                      <Star className="w-3 h-3 fill-current" />
                                      {item.rating}
                                    </div>
                                  </div>
                                  
                                  <h3 className="text-xl font-black text-slate-900 mb-2 group-hover/card:text-emerald-600 transition-colors">
                                    {item.name}
                                  </h3>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    {item.menu}
                                  </p>
                                  
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                        <ShoppingBag className="w-4 h-4" />
                                      </div>
                                      <span className="font-black text-slate-900">{item.price}</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm text-slate-500 leading-relaxed">
                                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                        <Sparkles className="w-4 h-4" />
                                      </div>
                                      <span>{item.features}</span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Product Price Summary Card Grid
                      if (Array.isArray(data) && data.length > 0 && data[0].mall) {
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
                            {data.map((item: any, idx: number) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group/card relative bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
                              >
                                <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 bg-indigo-500 group-hover/card:opacity-20 transition-opacity" />
                                
                                <div className="relative">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-sm">
                                      <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-100">
                                      {item.shipping}
                                    </div>
                                  </div>
                                  
                                  <h3 className="text-lg font-black text-slate-900 mb-1 group-hover/card:text-indigo-600 transition-colors">
                                    {item.mall}
                                  </h3>
                                  <div className="text-2xl font-black text-indigo-600 mb-4">
                                    {item.price}
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-3 text-sm text-slate-500 leading-relaxed">
                                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                        <Check className="w-4 h-4" />
                                      </div>
                                      <span className="text-xs font-medium">{item.benefit}</span>
                                    </div>
                                    {item.link && (
                                      <a 
                                        href={item.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        최저가 구매하기
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        );
                      }
                    } catch (e) {
                      console.error("Failed to parse summary JSON", e);
                    }
                  }
                  
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                table: ({node, ...props}) => (
                  <div className="relative my-8 group/table">
                    <div className={cn(
                      "absolute -inset-6 rounded-[3.5rem] blur-3xl pointer-events-none opacity-0 group-hover/table:opacity-100 transition-opacity duration-700",
                      type === 'price' ? "bg-indigo-500/5" : "bg-emerald-500/5"
                    )} />
                    <div className={cn(
                      "relative overflow-x-auto rounded-[2.5rem] border border-slate-200/60 shadow-2xl bg-white/80 backdrop-blur-md",
                      type === 'price' ? "shadow-indigo-100/30" : "shadow-emerald-100/30"
                    )}>
                      <table className="min-w-full border-separate border-spacing-0" {...props} />
                    </div>
                  </div>
                ),
                th: ({node, ...props}) => (
                  <th className={cn(
                    "p-5 text-left font-black uppercase tracking-widest text-[10px] border-b border-slate-100",
                    type === 'price' ? "bg-indigo-50/50 text-indigo-900" : "bg-emerald-50/50 text-emerald-900"
                  )} {...props} />
                ),
                td: ({node, ...props}) => {
                  const text = props.children?.toString() || '';
                  const isRating = text.includes('★') || (text.length <= 3 && !isNaN(parseFloat(text)) && text.includes('.'));
                  const isPrice = text.includes('원') || text.includes('₩');
                  
                  return (
                    <td className="p-5 text-sm text-slate-600 border-b border-slate-50 transition-colors group-hover:bg-slate-50/30" {...props}>
                      {isRating ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-xs border border-amber-100 shadow-sm">
                          <Sparkles className="w-3 h-3" />
                          {props.children}
                        </span>
                      ) : isPrice ? (
                        <span className="font-black text-slate-900">{props.children}</span>
                      ) : (
                        props.children
                      )}
                    </td>
                  );
                },
                li: ({node, ...props}) => (
                  <li className={cn(
                    "before:bg-indigo-400/50 before:shadow-indigo-100",
                    type === 'restaurant' && "before:bg-emerald-400/50 before:shadow-emerald-100"
                  )} {...props} />
                ),
                img: ({node, ...props}) => (
                  <div className="relative group my-14">
                    <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative bg-white p-3 rounded-[2.5rem] shadow-2xl border border-slate-100">
                      <img 
                        {...props} 
                        referrerPolicy="no-referrer" 
                        className="rounded-[2rem] w-full aspect-video object-contain bg-slate-50 transition-transform duration-700 group-hover:scale-[1.01]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(props.alt || 'product')}/800/450`;
                        }}
                      />
                    </div>
                  </div>
                ),
                hr: ({node, ...props}) => (
                  <div className="relative my-20">
                    <hr className="border-slate-100" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-white">
                      <div className="w-2 h-2 rounded-full bg-slate-200" />
                    </div>
                  </div>
                ),
              }}
            >
              {content}
            </Markdown>
          </div>
        </div>

        {/* Footer Section */}
        <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-slate-400 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider">
              AI-Generated Intelligence Report • Reference Only
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(content);
              }}
              className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              결과 복사하기
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [user, loadingAuth] = useAuthState(auth);
  const [priceQuery, setPriceQuery] = useState('');
  const [priceResult, setPriceResult] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  
  const [restQuery, setRestQuery] = useState('');
  const [restResult, setRestResult] = useState('');
  const [restLoading, setRestLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Location error:", err)
      );
    }
  }, []);

  const handlePriceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceQuery) return;

    setPriceLoading(true);
    setPriceResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `국내 최저가 상품을 심층 분석해주세요: "${priceQuery}". 
        
        출력 가이드 (이미지 제외, 텍스트 기반의 프리미엄 분석 리포트 작성):
        1. **절대 금지**: 어떠한 이미지(마크다운 이미지 포함)도 포함하지 마세요.
        2. **# [상품명] 최저가 정밀 분석 리포트**: 최상단에 상품명을 포함한 제목을 작성하세요.
        3. **## 📊 실시간 최저가 요약**: 모든 쇼핑몰의 최저가 정보를 한눈에 비교할 수 있도록 아래 JSON 형식을 사용하여 요약 리포트를 작성하세요. (반드시 마크다운 json 코드 블록 안에 작성하세요)
           \`\`\`json
           [
             { "mall": "쇼핑몰명", "price": "최저가(원)", "shipping": "배송비", "benefit": "카드/쿠폰 혜택", "link": "실제 쇼핑몰 URL" },
             ...
           ]
           \`\`\`
           - **주의**: JSON 데이터 외에 다른 텍스트를 코드 블록 안에 넣지 마세요. \`link\` 필드에는 반드시 유효한 URL을 넣으세요.
        4. **## 📋 상품 상세 정보 및 스펙**: 모델명, 주요 사양, 출시 정보를 상세히 기술하세요.
        5. **## 💰 실시간 최저가 비교 분석**: 
           - 주요 쇼핑몰별 가격, 배송비, 카드 혜택을 표(Table)로 정리하세요.
           - 현재 가격이 역대가 대비 어느 정도인지 텍스트로 분석하세요.
        6. **## 💬 실제 사용자 리뷰 요약**: 구매자들의 장단점 핵심 피드백을 정리하세요.
        7. **## 📉 AI 구매 적기 판단 가이드**: 지금 구매할지 기다릴지 근거와 함께 제시하세요.
        8. **## ✨ 전문가 추천 대안 모델**: 가성비가 더 좋거나 성능이 우수한 대안을 추천하세요.
        9. 전체적인 톤은 전문적이고 신뢰감 있게 작성하세요.`,
          useSearch: true
        })
      });

      if (!res.ok) throw new Error("AI 요청에 실패했습니다.");
      
      const data = await res.json();
      
      // Extract grounding metadata for source links
      const groundingChunks = data.groundingMetadata?.groundingChunks;
      let resultText = data.text || '결과를 가져오지 못했습니다.';
      
      if (groundingChunks && groundingChunks.length > 0) {
        const sources = groundingChunks
          .map((chunk: any) => chunk.web?.uri)
          .filter((uri: string | undefined): uri is string => !!uri);
        
        if (sources.length > 0) {
          resultText += "\n\n---\n### 🔗 쇼핑몰 바로가기\n" + 
            Array.from(new Set(sources)).map(url => `- [${new URL(url as string).hostname}](${url})`).join('\n');
        }
      }
      
      setPriceResult(resultText);
    } catch (err: any) {
      console.error("AI Price error:", err);
      setPriceResult(`최저가 정보를 가져오는 중 오류가 발생했습니다: ${err.message || "서버 설정을 확인해주세요."}`);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleRestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restQuery) return;

    setRestLoading(true);
    setRestResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `맛집 추천: "${restQuery}". 
        ${location ? `사용자 현재 위치: 위도 ${location.lat}, 경도 ${location.lng}` : ''}
        
        출력 가이드 (이미지 제외, 프리미엄 종합 분석 리포트 작성):
        1. **절대 금지**: 어떠한 이미지(마크다운 이미지 포함)도 포함하지 마세요.
        2. **# [지역/테마] AI 엄선 맛집 한눈에 보기**: 최상단에 제목을 작성하세요.
        3. **## 📊 추천 맛집 요약**: 모든 추천 맛집을 한눈에 비교할 수 있도록 아래 JSON 형식을 사용하여 요약 리포트를 작성하세요. (반드시 마크다운 json 코드 블록 안에 작성하세요)
           \`\`\`json
           [
             { "name": "맛집명", "menu": "주요메뉴", "price": "가격대", "features": "특징 요약", "rating": "4.8" },
             ...
           ]
           \`\`\`
        4. **## 🍽️ [맛집명]**: 첫 번째 추천 맛집의 이름을 제목으로 사용하고 심층 분석을 제공하세요.
           - **📍 위치 및 지도**: 위도/경도 대신 **구글 지도(Google Maps) 링크**를 반드시 포함하세요.
           - **⭐ 선정 이유 & 특징**: AI가 분석한 핵심 매력
           - **💬 방문객 리얼 보이스**: 최근 리뷰 요약
           - **💡 전문가 꿀팁**: 메뉴 추천, 웨이팅 팁 등
        5. **## 🍽️ [맛집명]**: 두 번째 추천 맛집의 이름을 제목으로 사용하고 심층 분석을 제공하세요. (위와 동일한 형식)
        6. **## 🍽️ [맛집명]**: 세 번째 추천 맛집의 이름을 제목으로 사용하고 심층 분석을 제공하세요. (위와 동일한 형식)
        7. **## ✨ AI 숨은 맛집 제안**: 잘 알려지지 않았지만 평점이 높은 대안 장소를 추천하세요.
        8. 한국어로 친절하고 생생하게 답변해주세요.`,
          useSearch: true
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "AI 요청에 실패했습니다.");
      }
      
      const data = await res.json();
      
      // Extract grounding metadata for source links
      const groundingChunks = data.groundingMetadata?.groundingChunks;
      let resultText = data.text || '결과를 가져오지 못했습니다.';
      
      if (groundingChunks && groundingChunks.length > 0) {
        const sources = groundingChunks
          .map((chunk: any) => chunk.web?.uri)
          .filter((uri: string | undefined): uri is string => !!uri);
        
        if (sources.length > 0) {
          resultText += "\n\n---\n### 🔗 참고 자료 및 출처\n" + 
            Array.from(new Set(sources)).map(url => `- [${new URL(url as string).hostname}](${url})`).join('\n');
        }
      }
      
      setRestResult(resultText);
    } catch (err: any) {
      console.error("AI Rest error:", err);
      setRestResult(`맛집 정보를 가져오는 중 오류가 발생했습니다: ${err.message || "서버 설정을 확인해주세요."}`);
    } finally {
      setRestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">AI 최저가 & 맛집 대시보드</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {loadingAuth ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-900">{user.displayName}</span>
                  <span className="text-[10px] text-slate-500">{user.email}</span>
                </div>
                <button 
                  onClick={signOut}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="로그아웃"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-100"
              >
                <LogIn className="w-4 h-4" />
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 h-full">
          
          {/* Top Left: AI Price Recommendation */}
          <Card title="AI 최저가 추천" icon={ShoppingBag}>
            <div className="flex flex-col h-full">
              <p className="text-sm text-slate-500 mb-4">
                국내 모든 쇼핑몰의 가격을 실시간으로 비교 분석합니다.
              </p>

              <form onSubmit={handlePriceSearch} className="relative mb-6 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <ShoppingBag className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="어떤 상품을 찾으시나요? (예: 아이폰 15 프로)"
                  className="w-full pl-12 pr-14 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-700 placeholder:text-slate-400"
                  value={priceQuery}
                  onChange={(e) => setPriceQuery(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={priceLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                >
                  {priceLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </form>
              
              <div className="flex-1 min-h-[300px]">
                <AnimatePresence mode="wait">
                  {priceLoading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20 text-slate-400"
                    >
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20" />
                        <div className="relative p-4 bg-indigo-50 rounded-full text-indigo-600">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-600 animate-pulse">최저가 정보를 실시간 분석 중입니다...</p>
                      <p className="text-xs text-slate-400 mt-2">잠시만 기다려 주세요.</p>
                    </motion.div>
                  ) : priceResult ? (
                    <AIResultDisplay content={priceResult} type="price" />
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50"
                    >
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
                        <ShoppingBag className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-sm font-medium">최고의 딜을 찾아보세요</p>
                      <p className="text-xs mt-1">검색어를 입력하여 AI 추천을 받아보세요.</p>
                      
                      <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {['에어팟 프로 2', '갤럭시 S24', '게이밍 모니터'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setPriceQuery(tag)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Card>

          {/* Top Right: AI Restaurant Recommendation */}
          <Card title="AI 맛집 추천" icon={Utensils}>
            <div className="flex flex-col h-full">
              <p className="text-sm text-slate-500 mb-4">
                다양한 채널의 후기를 분석하여 최적의 맛집을 추천해 드립니다.
              </p>
              
              <form onSubmit={handleRestSearch} className="relative mb-6 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="지역이나 메뉴를 입력하세요 (예: 강남역 파스타)"
                  className="w-full pl-12 pr-14 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-700 placeholder:text-slate-400"
                  value={restQuery}
                  onChange={(e) => setRestQuery(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={restLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                >
                  {restLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </form>

              <div className="flex-1 min-h-[300px]">
                <AnimatePresence mode="wait">
                  {restLoading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20 text-slate-400"
                    >
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20" />
                        <div className="relative p-4 bg-indigo-50 rounded-full text-indigo-600">
                          <Utensils className="w-8 h-8" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-600 animate-pulse">맛집 후기와 평가를 분석하고 있습니다...</p>
                      <p className="text-xs text-slate-400 mt-2">잠시만 기다려 주세요.</p>
                    </motion.div>
                  ) : restResult ? (
                    <AIResultDisplay content={restResult} type="restaurant" />
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50"
                    >
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
                        <MapPin className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-sm font-medium">어디로 떠나볼까요?</p>
                      <p className="text-xs mt-1">지역이나 메뉴를 검색하여 AI 추천을 받아보세요.</p>
                      
                      <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {['강남역 맛집', '제주도 흑돼지', '연남동 카페'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setRestQuery(tag)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Card>

          {/* Bottom Left: User Price Sharing */}
          <Card title="최저가 쇼핑 공유" icon={Share2}>
            <ShareForm 
              collectionName="priceShares" 
              placeholder="최저가 쇼핑몰, 카페, SNS 등 소개 (100자 이내)" 
            />
            <div className="mt-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> 주간 인기 공유 TOP 10
              </h3>
              <ShareList collectionName="priceShares" />
            </div>
          </Card>

          {/* Bottom Right: User Restaurant Sharing */}
          <Card title="맛집 정보 공유" icon={Share2}>
            <ShareForm 
              collectionName="restaurantShares" 
              placeholder="나만 아는 맛집 소개 (100자 이내)" 
            />
            <div className="mt-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> 주간 인기 공유 TOP 10
              </h3>
              <ShareList collectionName="restaurantShares" />
            </div>
          </Card>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            © 2026 AI 최저가 & 맛집 대시보드. 모든 정보는 AI 분석을 바탕으로 제공됩니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
